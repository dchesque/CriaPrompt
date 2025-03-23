import Head from 'next/head';
import Link from 'next/link';
import { SidebarNav } from '../components/SidebarNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ExternalLink, Github, Mail } from 'lucide-react';

export default function Sobre() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 relative overflow-hidden">
      <Head>
        <title>Sobre | CriaPrompt</title>
        <meta name="description" content="Conheça mais sobre a plataforma CriaPrompt" />
      </Head>
      
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none"></div>

      {/* Decorative elements */}
      <div className="absolute top-40 right-[20%] w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 left-[30%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <SidebarNav />
      
      <main className="flex-1 p-6 md:p-8 relative z-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">Sobre o CriaPrompt</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma para criar, gerenciar e compartilhar prompts para modelos de linguagem de IA.
            </p>
          </div>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle>Nossa Missão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                O CriaPrompt surgiu da necessidade de organizar e otimizar a maneira como interagimos com inteligências artificiais. 
                Nossa missão é democratizar o acesso a prompts eficientes, permitindo que pessoas de todos os níveis de experiência 
                com IA possam aproveitar ao máximo essas tecnologias.
              </p>
              <p>
                Acreditamos que prompts bem elaborados são a chave para resultados excepcionais com IAs generativas, 
                e queremos proporcionar ferramentas para que todos possam criar, armazenar e compartilhar seus melhores prompts.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle>Recursos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 list-disc list-inside">
                <li>Biblioteca pessoal de prompts organizados por categorias</li>
                <li>Compartilhamento de prompts com a comunidade</li>
                <li>Campos personalizáveis para criar prompts dinâmicos e reutilizáveis</li>
                <li>Interface intuitiva para edição e visualização de prompts</li>
                <li>Sistema de favoritos para salvar os melhores prompts da comunidade</li>
                <li>Estatísticas de uso e visualizações</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="bg-background/30 backdrop-blur-xl border border-white/20">
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Tem dúvidas, sugestões ou encontrou algum problema? Entre em contato conosco:
                </p>
                <div className="flex items-center gap-2">
                  <Mail size={18} />
                  <a 
                    href="mailto:contato@criaprompt.com.br" 
                    className="text-primary hover:underline"
                  >
                    contato@criaprompt.com.br
                  </a>
                </div>
                
                <div className="flex items-center gap-2">
                  <Github size={18} />
                  <a 
                    href="https://github.com/criaprompt" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    github.com/criaprompt
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center mt-8">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} CriaPrompt. Todos os direitos reservados.
            </p>
            <div className="mt-2 flex justify-center gap-4">
              <Link href="/termos" className="text-primary text-sm hover:underline">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="text-primary text-sm hover:underline">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}