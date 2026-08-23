export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eef3f8] font-sans">
      <main className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-2xl border border-[#e3eaf2] bg-white px-10 py-16 text-center shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-[#123a5e]">Clini</span>
          <span className="text-[#2fb3a6]">box</span>
        </h1>
        <p className="text-lg text-[#16324e]">Portal médico</p>
        <p className="max-w-md text-sm leading-6 text-[#6b7f97]">
          Plataforma de telemedicina y gestión clínica para zonas rurales.
          Aquí los médicos revisarán consultas, pacientes y unidades Clinibox.
        </p>
        <span className="rounded-full bg-[#2fb3a6]/10 px-4 py-1.5 text-xs font-semibold text-[#1f9488]">
          En desarrollo — MVP
        </span>
      </main>
    </div>
  );
}
