import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow">
      <div className="container-app py-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold text-indigo-600 cursor-pointer">CriaPrompt</span>
          </Link>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/">
                  <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Início</span>
                </Link>
              </li>
              <li>
                <Link href="/criar">
                  <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Criar Prompt</span>
                </Link>
              </li>
              <li>
                <Link href="/favoritos">
                  <span className="text-gray-700 hover:text-indigo-600 cursor-pointer">Favoritos</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}