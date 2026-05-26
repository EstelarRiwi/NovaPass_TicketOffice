<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PrintController;

Route::post('/print', [PrintController::class, 'print']);

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
