import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Sobre() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Head>
        <title>Sobre | CriaPrompt</title>
        <meta name="description" content="Sobre a plataforma CriaPrompt" />
      </Head>

      <Header />

      <main className="container-app py-10 flex-grow">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Sobre o CriaPrompt
        </h1>

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Nossa Missão</h2>
          <p className="text-gray-700 mb-6">
            O CriaPrompt nasceu da necessidade de organizar e compartilhar prompts eficientes para trabalhar com Inteligência Artificial. Nossa missão é ajudar pessoas a maximizarem o potencial das IAs modernas através de prompts bem estruturados e específicos.
          </p>
          <p className="text-gray-700">
            Acreditamos que a habilidade de criar bons prompts é uma competência cada vez mais valiosa no mundo atual. Por isso, criamos uma plataforma onde você pode gerenciar seus próprios prompts e aprender com a comunidade, compartilhando conhecimento e técnicas.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recursos Principais</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-indigo-600 mb-2">Biblioteca Pessoal</h3>
              <p className="text-gray-700">
                Crie uma biblioteca pessoal de prompts organizados por categorias, com acesso fácil e rápido quando você precisar.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-indigo-600 mb-2">Compartilhamento</h3>
              <p className="text-gray-700">
                Compartilhe seus melhores prompts com a comunidade e ajude outros usuários a melhorarem suas interações com IA.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-indigo-600 mb-2">Exploração</h3>
              <p className="text-gray-700">
                Descubra prompts criados por outros usuários e aprenda novas técnicas para suas próprias criações.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-indigo-600 mb-2">Estatísticas</h3>
              <p className="text-gray-700">
                Acompanhe o desempenho dos seus prompts e veja quais são mais populares na comunidade.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-4">Equipe</h2>
          <p className="text-gray-700 mb-6">
            O CriaPrompt é desenvolvido e mantido por uma equipe apaixonada por tecnologia e inteligência artificial, com o objetivo de tornar essas ferramentas mais acessíveis e produtivas para todos.
          </p>
          <p className="text-gray-700">
            Estamos constantemente trabalhando para melhorar a plataforma e trazer novos recursos baseados no feedback da comunidade. Se você tiver sugestões ou encontrar algum problema, não hesite em entrar em contato conosco!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}