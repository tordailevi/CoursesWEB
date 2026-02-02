import Link from "next/link";

export default function Home() {
  return (
    <div className="card-grid">
      <section className="card hero-card">
        <h1>Practice courses, track your progress.</h1>
        <p>
          Answer questions in each course, see what you got right, and pick up
          where you left off next time.
        </p>
        <div className="button-row">
          <Link href="/courses" className="btn btn-primary">
            Browse courses
          </Link>
          <Link href="/register" className="btn btn-ghost">
            Create an account
          </Link>
        </div>
        <p className="muted">
          You can also try courses as a guest. Progress is saved in this
          browser, but will be tied to your account once you sign in.
        </p>
      </section>

      <section className="card">
        <h2>How it works</h2>
        <ol className="steps">
          <li>Select a course you want to complete.</li>
          <li>Answer the multiple-choice questions.</li>
          <li>
            See your score and continue later – even better if you&apos;re
            logged in.
          </li>
        </ol>
      </section>
    </div>
  );
}
