let myCharts = {}; // Store multiple charts for each equipment
let ws;
let initialRender = true;
let selectedEquipment = []; // Store selected equipment numbers
let selectedParameter = {}; // Store selected parameters for each equipment
let equipmentData = []; // Initialize your JSON data here


function initializeWebSocket() {
    ws = new WebSocket('wss://172.16.2.101:7050');
    ws.onopen = () => console.log('WebSocket connection Open');
    ws.onmessage = event => {
        const data = JSON.parse(event.data);
        console.log("Data Received: ", data);
        
        equipmentData = data; // Store the received data in equipmentData array
        renderEquipmentList(data); // Populate modal with equipment list
        
        // Render charts for selected equipment if data has arrived
        if (selectedEquipment.length > 0) {
            renderCharts(data.filter(item => selectedEquipment.includes(item.label)));
        }
        startMonitoring();
    };
}

// Populate the equipment list in the modal
function renderEquipmentList(data) {
    const equipmentList = $('#equipmentList');
    $('#loadingIndicator').show();
    equipmentList.empty(); // Clear previous list

    const uniqueEquipment = new Set(); // To track unique equipment

    // Create checkboxes for each unique equipment
    data.forEach(item => {
        if (!uniqueEquipment.has(item.label)) {
            uniqueEquipment.add(item.label); // Add the label to the set

            const isChecked = userPreferences.includes(item.label) ? 'checked' : '';
            const listItem = `
                <div class="form-check">
                    <input type="checkbox" class="form-check-input equipment-checkbox" value="${item.label}" id="${item.label}" ${isChecked}>
                    <label class="form-check-label" for="${item.label}">
                        ${item.label}
                    </label>
                </div>
            `;
            equipmentList.append(listItem);
            $('#loadingIndicator').hide();
        }
    });

    // Show the equipment list if there are items
    if (uniqueEquipment.size > 0) {
        $('#equipmentList').removeClass('d-none');
    } else {
        $('#equipmentList').addClass('d-none');
    }
}

// Render charts for selected equipment only
function renderCharts(data) {
    const latestDataMap = {};

    data.forEach(item => {
        const key = item.label;
        if (!latestDataMap[key] || new Date(item.datetime) > new Date(latestDataMap[key].datetime)) {
            latestDataMap[key] = item;
        }
    });

    const latestDataArray = Object.values(latestDataMap);

    latestDataArray.forEach(item => {
        const equipmentNo = item.label;
        if (selectedEquipment.includes(equipmentNo)) {
            if (!myCharts[equipmentNo]) {
                createNewCardAndChart(equipmentNo);
            }
            updateChart(equipmentNo, [item]);
        }
    });
}

function createNewCardAndChart(equipmentNo) {
    const cardsContainer = document.getElementById('cardsContainer');

    // Create a new card for the equipment
    const card = document.createElement('div');
    card.classList.add('col-md-6', 'mb-6'); // Responsive column
    card.innerHTML = `
        <br>
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col">
                        <h5 id="monitorLabel" class="me-3">${equipmentNo}</h5>
                    </div>
                </div>
                <div class="row">
                    <div class="col">
                        <div class="dropdown">
                            <div class="d-flex align-items-center">
                                <button class="btn btn-primary dropdown-toggle" id="disabledParameter-${equipmentNo}" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    Parameters
                                </button>
                            </div>
                            <div class="dropdown-menu" id="parameterDropdown-${equipmentNo}"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div id="chartsContainer-${equipmentNo}">
                    <canvas id="chart-${equipmentNo}" width="400" height="200"></canvas>
                </div> <!-- Container for dynamic chart -->
            </div>
        </div>
    `;
    
    // Append the card to the cards container
    cardsContainer.appendChild(card);

    // Initialize the chart inside the card
    const ctx = document.getElementById(`chart-${equipmentNo}`).getContext('2d');
    myCharts[equipmentNo] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grace: '10%',
                    suggestedMax: null,
                }
            }
        }
    });

    // Initialize selected parameter
    selectedParameter[equipmentNo] = null;
}

function updateChart(equipmentNo, data) {
    const chart = myCharts[equipmentNo];
    const parameters = [...new Set(data.map(item => item.parameter))];

    // Populate dropdown for parameters if initial render
    if (!selectedParameter[equipmentNo]) {
        populateParameterDropdown(equipmentNo, parameters);
    }

    // Filter data for the selected parameter
    const equipmentData = data.filter(item => item.parameter === selectedParameter[equipmentNo]);

    if (!equipmentData.length) return; // Skip if no data for selected parameter

    // Process only the latest data point for the selected parameter
    const latestData = equipmentData.slice(-1)[0]; // Get the latest data point
    const { parameter, value, ucl, lcl, datetime } = latestData;

    // Check if the point is already in the chart
    const existingIndex = chart.data.labels.findIndex(label => label === datetime);
    if (existingIndex !== -1) {
        // If it already exists, update it instead of adding
        chart.data.datasets[0].data[existingIndex] = value;
        chart.data.datasets[1].data[existingIndex] = ucl;
        chart.data.datasets[2].data[existingIndex] = lcl;
        chart.update();
        return;
    }

    // Initialize datasets if not present
    if (chart.data.datasets.length === 0) {
        // Add the dataset for the selected parameter
        chart.data.datasets.push({
            label: `${parameter} (${value})`, // Set initial label
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        });

        // Add UCL and LCL datasets for the selected parameter
        chart.data.datasets.push({
            label: `UCL (${ucl})`,
            data: [],
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            pointRadius: 0,
            borderDash: [2, 2],
            tension: 0.1,
            animation: { duration: 0 }
        });

        chart.data.datasets.push({
            label: `LCL (${lcl})`,
            data: [],
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            pointRadius: 0,
            borderDash: [2, 2],
            tension: 0.1,
            animation: { duration: 0 }
        });
    } else {
        // Update the label to reflect the latest value if the dataset exists
        chart.data.datasets[0].label = `${parameter} (${value})`;
    }

    // Add new data point
    chart.data.datasets[0].data.push(value);
    chart.data.datasets[1].data.push(ucl);
    chart.data.datasets[2].data.push(lcl);

    // Add new label
    chart.data.labels.push(datetime);

    // Limit to 10 points
    if (chart.data.labels.length > 10) {
        chart.data.labels.shift(); // Remove the oldest label
        chart.data.datasets.forEach(dataset => dataset.data.shift()); // Remove the oldest data point
    }
    chart.update();
}

function populateParameterDropdown(equipmentNo, parameters) {
    const dropdown = document.getElementById(`parameterDropdown-${equipmentNo}`);
    
    parameters.forEach(parameter => {
        const dropdownItem = document.createElement('button');
        dropdownItem.classList.add('dropdown-item');
        dropdownItem.innerText = parameter;
        dropdownItem.addEventListener('click', () => {
            selectedParameter[equipmentNo] = parameter;
            document.getElementById(`disabledParameter-${equipmentNo}`).innerText = parameter;
            updateChart(equipmentNo, equipmentData); // Trigger chart update when parameter changes
        });
        dropdown.appendChild(dropdownItem);
    });

    // Set initial parameter
    selectedParameter[equipmentNo] = parameters[0];
    document.getElementById(`disabledParameter-${equipmentNo}`).innerText = parameters[0];
}

function resetChart(equipmentNo) {
    const chart = myCharts[equipmentNo];
    chart.data.labels = [];
    chart.data.datasets = [];
    chart.update();
}


// Event listener for 'Monitor Selected' button
document.getElementById('monitorSelectedBtn').addEventListener('click', startMonitoring);

// Event listener for 'Start Monitor' button
document.getElementById('startMonitor').addEventListener('click', startMonitoring);


// The function that both buttons will trigger
function startMonitoring() {

    selectedEquipment = [];
    document.querySelectorAll('.equipment-checkbox:checked').forEach(checkbox => {
        if (!selectedEquipment.includes(checkbox.value)) {
            selectedEquipment.push(checkbox.value);
        }
    });

    console.log('Monitoring started for selected equipment:', selectedEquipment);

    // Render charts for the selected equipment
    renderCharts(equipmentData.filter(item => selectedEquipment.includes(item.label)));
}

// Initialize WebSocket
initializeWebSocket();