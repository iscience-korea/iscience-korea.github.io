<?php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

$counterFile = __DIR__ . "/counter.json";

if (!file_exists($counterFile)) {
    file_put_contents(
        $counterFile,
        json_encode(["total" => 0], JSON_PRETTY_PRINT)
    );
}

$data = json_decode(file_get_contents($counterFile), true);

if (!$data) {
    $data = ["total" => 0];
}

/*
 * 방문자 수 증가
 * 실제 운영 시에는 쿠키/IP 중복 방지 권장
 */
$data["total"]++;

file_put_contents(
    $counterFile,
    json_encode($data, JSON_PRETTY_PRINT)
);

echo json_encode($data);