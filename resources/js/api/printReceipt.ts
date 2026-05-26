interface ReceiptData {
  ticket_id:      string
  customer_name:  string
  customer_email?: string
  event_name:     string
  event_date:     string
  category_name:  string
  quantity:       number
  total:          number
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  const res = await fetch('/print', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const json = await res.json()
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? 'Error al imprimir')
  }
}
