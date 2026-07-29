export default function ClaimCanceledPage({ params }: { params: { cellId: string } }) {
  return (
    <div style={{ maxWidth: 420, margin: '0 auto', padding: 24 }}>
      <h1>Оплата не завершена</h1>
      <p>Клетка {params.cellId} осталась не оплаченной. Вернитесь на карту и попробуйте снова.</p>
      <a href="/">На карту</a>
    </div>
  );
}
