import Link from "next/link";
import CreateAlertForm from "./components/CreateAlertForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">✈ El Al Flight Finder</h1>
          <p className="text-blue-200 text-sm">Monitor prices and get alerted when they drop</p>
        </div>
        <Link
          href="/alerts"
          className="text-sm bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors"
        >
          My Alerts →
        </Link>
      </header>

      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Create a Price Alert</h2>
          <p className="text-gray-500 text-sm mb-8">
            We&apos;ll check prices every 6 hours and email you when we find a deal.
          </p>
          <CreateAlertForm />
        </div>
      </div>
    </main>
  );
}
