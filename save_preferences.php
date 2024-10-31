<?php
session_start();

$filename = 'user_preferences.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $equipment = $_POST['equipment'] ?? [];
    $userId = $_SESSION['alogin'];

    // Load existing preferences
    $preferences = file_exists($filename) ? json_decode(file_get_contents($filename), true) : [];

    // Update user's preferences
    $preferences[$userId] = $equipment;

    // Save back to JSON file
    file_put_contents($filename, json_encode($preferences, JSON_PRETTY_PRINT));

    echo json_encode(['success' => true]);
}
?>
