import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-10">
      <div className="container-app">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <h3 className="text-2xl font-bold mb-2">CriaPrompt</h3>
            <p className="text-gray-400">
              A plataforma para criar, organizar e compartilhar prompts de IA
            </p>
          </div>
          <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:space-x-6">
            <Link href="/explorar">
              <span className="text-gray-400 hover:text-white cursor-pointer">Explorar</span>
            </Link>
            <Link href="/busca">
              <span className="text-gray-400 hover:text-white cursor-pointer">Busca</span>
            </Link>
            <Link href="/estatisticas">
              <span className="text-gray-400 hover:text-white cursor-pointer">Estatísticas</span>
            </Link>
            <Link href="/sobre">
              <span className="text-gray-400 hover:text-white cursor-pointer">Sobre</span>
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} CriaPrompt. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}