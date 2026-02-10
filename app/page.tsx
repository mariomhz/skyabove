import Hero from "@/components/Hero";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />

      {/* More sections will go here */}
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-4xl text-white">Flight Dashboard Preview</h2>
          <p className="mt-4 text-white/50">Coming soon...</p>
        </div>
      </section>
    </main>
  );
}
