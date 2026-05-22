# Script to run xAPI tests

cd C:\Users\h0lly\IdeaProjects\lecturer-assistant

Write-Host "=== Stopping old containers ===" -ForegroundColor Green
docker-compose -f docker-compose-monitoring.yml down

Write-Host "`n=== Waiting 3 seconds ===" -ForegroundColor Green
Start-Sleep -Seconds 3

Write-Host "`n=== Starting containers ===" -ForegroundColor Green
docker-compose -f docker-compose-monitoring.yml up -d

Write-Host "`n=== Waiting 10 seconds (services initialization) ===" -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host "`n=== Container status ===" -ForegroundColor Green
docker-compose -f docker-compose-monitoring.yml ps

Write-Host "`n=== Sending test events ===" -ForegroundColor Green

# Event 1: Rating 5
Write-Host "1. Sending clarity rating (rating=5)..."
$body1 = @{
    verb = "rated"
    lectureId = 1
    slideId = 1
    chatId = 1
    rating = 5
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8084/xapi/events" -Method POST -ContentType "application/json" -Body $body1 | Out-Null
Write-Host "   OK"

# Event 2: Rating 4
Start-Sleep -Seconds 1
Write-Host "2. Sending clarity rating (rating=4)..."
$body2 = @{
    verb = "rated"
    lectureId = 1
    slideId = 1
    chatId = 2
    rating = 4
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8084/xapi/events" -Method POST -ContentType "application/json" -Body $body2 | Out-Null
Write-Host "   OK"

# Event 3: Slide shown
Start-Sleep -Seconds 1
Write-Host "3. Sending slide_shown event..."
$body3 = @{
    verb = "slide_shown"
    lectureId = 1
    slideId = 1
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8084/xapi/events" -Method POST -ContentType "application/json" -Body $body3 | Out-Null
Write-Host "   OK"

# Event 4: Question (30 seconds later)
Start-Sleep -Seconds 30
Write-Host "4. Sending question (after 30 seconds)..."
$body4 = @{
    verb = "asked"
    lectureId = 1
    slideId = 1
    chatId = 1
    questionText = "What is this?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8084/xapi/events" -Method POST -ContentType "application/json" -Body $body4 | Out-Null
Write-Host "   OK"

# Event 5: Second question
Start-Sleep -Seconds 15
Write-Host "5. Sending second question (after 45 seconds)..."
$body5 = @{
    verb = "asked"
    lectureId = 1
    slideId = 1
    chatId = 2
    questionText = "Can you explain again?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8084/xapi/events" -Method POST -ContentType "application/json" -Body $body5 | Out-Null
Write-Host "   OK"

# Get metrics
Write-Host "`n=== Getting calculated metrics ===" -ForegroundColor Green
Start-Sleep -Seconds 2

$response = Invoke-WebRequest -Uri "http://localhost:8084/xapi/lectures/1/clarity" -Method GET
$metrics = $response.Content | ConvertFrom-Json

Write-Host "`nMetrics for lecture 1:" -ForegroundColor Cyan
Write-Host "  Clarity Rating (CR):        $($metrics.clarityRating)" -ForegroundColor Yellow
Write-Host "  Question Density (QD):      $($metrics.questionDensity)" -ForegroundColor Yellow
Write-Host "  Question Temporal Depth:    $($metrics.questionTemporalDepth) seconds" -ForegroundColor Yellow

Write-Host "`n=== Service URLs ===" -ForegroundColor Green
Write-Host "Grafana:    http://localhost:3000 (admin/admin)" -ForegroundColor Cyan
Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Cyan
Write-Host "API:        http://localhost:8084" -ForegroundColor Cyan

Write-Host "`nDone!" -ForegroundColor Green
