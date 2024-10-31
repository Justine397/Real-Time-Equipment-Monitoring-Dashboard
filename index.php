<?php
session_start(); // Start the session
$_SESSION['alogin'] = 2024; // Set session variable for testing

$filename = 'user_preferences.json';

// Load preferences from JSON file if it exists
if (file_exists($filename)) {
    $preferences = json_decode(file_get_contents($filename), true);
} else {
    $preferences = [];
}

// Initialize user's selected equipment
$userPreferences = $preferences[$_SESSION['alogin']] ?? [];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monitor</title>
    <script src="js/chart.js"></script> 
    <script src="js/jquery-3.6.0.min.js"></script>
    <link rel="stylesheet" href="bootstrap/bootstrap.min.css">
</head>
<body>
    <div class="container-fluid">
        <div class="col-xl-12 col-lg-12 col-md-12 col-sm-12 col-12">
            <div class="page-header">
                <div class="page-breadcrumb">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="index.php" class="breadcrumb-link">Home</a></li>
                        </ol>
                    </nav>
                </div>
            </div>
        </div>

        <!-- Button to open the modal -->
        <button id="openMonitorModal" class="btn btn-primary">Filter</button>
        
        <!-- Button to open the modal -->
        <button id="startMonitor" class="btn btn-primary">Monitor</button>

        <div id="cardsContainer" class="row">
            <!-- Dynamic cards for each equipment will be created here -->
        </div>
    </div>


    <!-- Equipment Selection Modal -->
    <div class="modal fade" id="selectEquipmentModal" tabindex="-1" aria-labelledby="selectEquipmentModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="selectEquipmentModalLabel">Select Equipment to Monitor</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Select equipment to monitor:</p>
                    <div class="d-flex justify-content-center">
                        <div id="loadingIndicator" class="spinner-border text-primary" role="status">
                          <span class="sr-only"></span>
                        </div>
                    </div>
                    <div id="equipmentList" class="list-group d-none">
                        <!-- Dynamically populated list of equipment checkboxes -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="monitorSelectedBtn">Monitor Selected</button>
                </div>
            </div>
        </div>
    </div>

    <script src="bootstrap/bootstrap.bundle.min.js"></script>
    <script src="js/monitorScript.js"></script>  

    <script>
        $(document).ready(function() {
            // Check if user has saved preferences
            const userPreferences = <?php echo json_encode($userPreferences); ?>;

            if (userPreferences.length === 0) {
                // No saved preferences, show the modal
                $('#selectEquipmentModal').modal('show');
            } else {
                // Preferences found, initialize monitoring with selected equipment
                initializeMonitoring(userPreferences);
            }

            // Handle monitor button click
            $('#monitorSelectedBtn').on('click', function() {
                const equipmentCount = $('#equipmentList').children().length;
                
                if (equipmentCount === 0) {
                    alert('No equipment available to select.');
                    return; // Exit the function early
                }

                // Collect selected equipment
                const selectedEquipment = $('.equipment-checkbox:checked').map(function() {
                    return this.value;
                }).get();

                if (selectedEquipment.length > 0) {
                    // Close modal and pass selected equipment to monitoring logic
                    $('#selectEquipmentModal').modal('hide');
                    initializeMonitoring(selectedEquipment);
                    savePreferences(selectedEquipment);
                } else {
                    alert('Please select at least one equipment to monitor.');
                }
            });

            // Open modal to select equipment
            $('#openMonitorModal').click(function () {
                $('#selectEquipmentModal').modal('show');
                renderEquipmentList();
            });
        });

        function savePreferences(selectedEquipment) {
            $.ajax({
                type: 'POST',
                url: 'save_preferences.php',
                data: { equipment: selectedEquipment },
                success: function(response) {
                    console.log('Preferences saved:', response);
                }
            });
        }

        function initializeMonitoring(selectedEquipment) {
            console.log('Selected equipment to monitor:', selectedEquipment);
            // Reset and reload charts based on selected equipment
        selectedEquipment.forEach(equipmentNo => {
            if (!myCharts[equipmentNo]) {
                createNewCardAndChart(equipmentNo);
                startMonitoring();
            }
        });
        }

        
    </script>

<script>
    const userPreferences = <?php echo json_encode($userPreferences); ?>; // Pass the user preferences to JS
</script>

</body>
</html>
