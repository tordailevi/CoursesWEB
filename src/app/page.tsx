import Link from "next/link";

export default function Home() {
  return (
    <div className="card-grid">
      <section className="card hero-card">
        <h1>Gyakorolj kurzusokat, kövesd a haladásod.</h1>
        <p>
          Válaszolj a kérdésekre, nézd meg mi lett helyes, és folytasd később ott,
          ahol abbahagytad.
        </p>
        <div className="button-row">
          <Link href="/courses" className="btn btn-primary">
            Kurzusok megtekintése
          </Link>
          <Link href="/register" className="btn btn-ghost">
            Fiók létrehozása
          </Link>
        </div>
        <p className="muted">
          Vendégként is kipróbálhatod a kurzusokat. A haladás ebben a böngészőben
          mentődik, belépés után pedig a fiókodhoz lesz kötve.
        </p>
      </section>

      <section className="card">
        <h2>Hogyan működik?</h2>
        <ol className="steps">
          <li>Válassz egy kurzust.</li>
          <li>Válaszolj a feleletválasztós kérdésekre.</li>
          <li>
            Mentsd a válaszaidat, nézd meg az eredményt, és folytasd később –
            belépve még kényelmesebb.
          </li>
        </ol>
      </section>
    </div>
  );
}
