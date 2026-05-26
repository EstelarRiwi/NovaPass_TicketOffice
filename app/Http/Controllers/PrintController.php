<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PrintController extends Controller
{
    private const PRINTER = '/dev/usb/lp0';

    // ESC/POS constants
    private const ESC = "\x1b";
    private const GS  = "\x1d";
    private const LF  = "\x0a";

    public function print(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ticket_id'      => 'required|string',
            'customer_name'  => 'required|string',
            'customer_email' => 'nullable|string',
            'event_name'     => 'required|string',
            'event_date'     => 'required|string',
            'category_name'  => 'required|string',
            'quantity'       => 'required|integer|min:1',
            'total'          => 'required|numeric',
        ]);

        $bytes = $this->buildReceipt($data);

        $device = self::PRINTER;
        if (!file_exists($device) || !is_writable($device)) {
            // Fallback: send via CUPS lp command
            $tmp = tempnam(sys_get_temp_dir(), 'receipt_') . '.bin';
            file_put_contents($tmp, $bytes);
            $result = shell_exec("lp -d Xprinter-XP58 " . escapeshellarg($tmp) . " 2>&1");
            unlink($tmp);
            if (str_contains((string) $result, 'error') || empty($result)) {
                return response()->json(['ok' => false, 'error' => 'Printer not available: ' . $result], 500);
            }
            return response()->json(['ok' => true, 'method' => 'cups']);
        }

        $fh = @fopen($device, 'wb');
        if (!$fh) {
            return response()->json(['ok' => false, 'error' => 'Cannot open printer device'], 500);
        }
        fwrite($fh, $bytes);
        fclose($fh);

        return response()->json(['ok' => true, 'method' => 'direct']);
    }

    private function buildReceipt(array $d): string
    {
        $ESC = self::ESC;
        $GS  = self::GS;
        $LF  = self::LF;

        $total    = number_format($d['total'], 0, ',', '.');
        $perUnit  = number_format($d['total'] / $d['quantity'], 0, ',', '.');
        $date     = date('d/m/Y H:i', strtotime($d['event_date']));
        $now      = date('d/m/Y H:i:s');
        $qty      = $d['quantity'];
        $cat      = $d['category_name'];
        $width    = 32; // chars per line at 58mm

        $out = '';

        // Init printer
        $out .= $ESC . '@';

        // Center + big text for header
        $out .= $ESC . 'a' . chr(1);         // center
        $out .= $ESC . '!' . chr(0x30);       // double width + height
        $out .= 'NovaPass' . $LF;
        $out .= $ESC . '!' . chr(0x00);       // normal
        $out .= 'Punto de Venta' . $LF;
        $out .= $this->dashedLine($width) . $LF;

        // Ticket ID box
        $out .= 'N: BOLETA' . $LF;
        $out .= $ESC . 'E' . chr(1);          // bold on
        $out .= $d['ticket_id'] . $LF;
        $out .= $ESC . 'E' . chr(0);          // bold off
        $out .= $this->dashedLine($width) . $LF;

        // Left align
        $out .= $ESC . 'a' . chr(0);

        // Customer
        $out .= 'Cliente:' . $LF;
        $out .= $ESC . 'E' . chr(1);
        $out .= $this->wrapLine($d['customer_name'], $width) . $LF;
        $out .= $ESC . 'E' . chr(0);
        if (!empty($d['customer_email'])) {
            $out .= $this->wrapLine($d['customer_email'], $width) . $LF;
        }
        $out .= $this->dashedLine($width) . $LF;

        // Event
        $out .= 'Evento:' . $LF;
        $out .= $ESC . 'E' . chr(1);
        $out .= $this->wrapLine($d['event_name'], $width) . $LF;
        $out .= $ESC . 'E' . chr(0);
        $out .= $date . $LF;
        $out .= $this->dashedLine($width) . $LF;

        // Details
        $out .= $this->colRow('Categoria', $cat, $width) . $LF;
        $out .= $this->colRow('Cantidad', $qty . ' boleta' . ($qty > 1 ? 's' : ''), $width) . $LF;
        $out .= $this->colRow('P. unitario', '$ ' . $perUnit, $width) . $LF;
        $out .= $this->solidLine($width) . $LF;

        // Total
        $out .= $ESC . '!' . chr(0x10);       // double height
        $out .= $this->colRow('TOTAL', '$ ' . $total, $width) . $LF;
        $out .= $ESC . '!' . chr(0x00);
        $out .= $this->solidLine($width) . $LF;

        // Footer
        $out .= $ESC . 'a' . chr(1);          // center
        $out .= $LF;
        $out .= 'Conserve esta boleta para' . $LF;
        $out .= 'acceso al evento' . $LF;
        $out .= $this->dashedLine($width) . $LF;
        $out .= $now . $LF;
        $out .= $LF . $LF . $LF;

        // Cut paper
        $out .= $GS . 'V' . chr(0);

        return $out;
    }

    private function dashedLine(int $w): string
    {
        return str_repeat('-', $w);
    }

    private function solidLine(int $w): string
    {
        return str_repeat('=', $w);
    }

    private function wrapLine(string $text, int $width): string
    {
        return wordwrap($text, $width, "\n", true);
    }

    private function colRow(string $left, string $right, int $width): string
    {
        $right  = (string) $right;
        $spaces = $width - strlen($left) - strlen($right);
        if ($spaces < 1) $spaces = 1;
        return $left . str_repeat(' ', $spaces) . $right;
    }
}
