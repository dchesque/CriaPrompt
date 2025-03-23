import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import AdminLayout from '../../../components/layouts/AdminLayout';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  User, 
  Edit, 
  Trash, 
  Mail, 
  Shield, 
  ShieldAlert, 
  Lock, 
  Unlock,
  Loader2 
} from 'lucide-react';

export default function UsuariosAdmin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [dialogoExcluirAberto, setDialogoExcluirAberto] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null);
  const [dialogoAlterarPlanoAberto, setDialogoAlterarPlanoAberto] = useState(false);
  const [usuarioParaAlterar, setUsuarioParaAlterar] = useState(null);
  const [novoPlano, setNovoPlano] = useState('');
  const itensPorPagina = 10;

  useEffect(() => {
    const carregarPlanos = async () => {
      try {
        const { data, error } = await supabase
          .from('planos')
          .select('*')
          .order('preco');

        if (error) throw error;
        setPlanos(data || []);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        toast.error('Erro ao carregar planos');
      }
    };

    carregarPlanos();
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [paginaAtual, termoBusca, filtroPlano]);

  const carregarUsuarios = async () => {
    setIsLoading(true);
    try {
      // Calcular os limites para paginação
      const from = (paginaAtual - 1) * itensPorPagina;
      const to = from + itensPorPagina - 1;

      // Construir a query base
      let query = supabase
        .from('auth.users')
        .select(`
          id,
          email,
          created_at,
          last_sign_in_at,
          user_metadata,
          banned_until,
          perfis_usuario!inner (
            id, 
            nome_completo, 
            plano_atual,
            imagem_perfil,
            is_admin
          ),
          assinaturas (
            id,
            status,
            plano_id,
            data_expiracao,
            planos (
              nome,
              preco
            )
          )
        `, { count: 'exact' });

      // Aplicar filtros se existirem
      if (termoBusca) {
        query = query.or(`email.ilike.%${termoBusca}%,perfis_usuario.nome_completo.ilike.%${termoBusca}%`);
      }

      if (filtroPlano) {
        query = query.eq('perfis_usuario.plano_atual', filtroPlano);
      }

      // Aplicar paginação e ordenação
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Calcular o total de páginas
      const total = Math.ceil((count || 0) / itensPorPagina);
      setTotalPaginas(total > 0 ? total : 1);
      
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getNomePlano = (planoId) => {
    const plano = planos.find(p => p.id === planoId);
    return plano ? plano.nome : 'Gratuito';
  };

  const getStatusAssinatura = (usuario) => {
    if (!usuario.assinaturas || usuario.assinaturas.length === 0) {
      return 'Gratuito';
    }
    
    // Pegar a assinatura mais recente
    const assinatura = usuario.assinaturas[0];
    
    if (assinatura.status === 'ativa') {
      return 'Ativa';
    } else if (assinatura.status === 'teste') {
      return 'Período de teste';
    } else if (assinatura.status === 'cancelada') {
      return 'Cancelada';
    } else if (assinatura.status === 'expirada') {
      return 'Expirada';
    }
    
    return 'Desconhecido';
  };

  const confirmarExclusao = (usuario) => {
    setUsuarioParaExcluir(usuario);
    setDialogoExcluirAberto(true);
  };

  const excluirUsuario = async () => {
    if (!usuarioParaExcluir) return;
    
    try {
      // Primeiro excluir o perfil e dados relacionados
      const { error: perfilError } = await supabase
        .from('perfis_usuario')
        .delete()
        .eq('id', usuarioParaExcluir.id);
        
      if (perfilError) throw perfilError;
      
      // Depois excluir o usuário do auth
      const { error: authError } = await supabase.auth.admin.deleteUser(
        usuarioParaExcluir.id
      );
      
      if (authError) throw authError;
      
      toast.success('Usuário excluído com sucesso');
      
      // Atualizar a lista
      setUsuarios(usuarios.filter(u => u.id !== usuarioParaExcluir.id));
      setDialogoExcluirAberto(false);
      setUsuarioParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário: ' + error.message);
    }
  };

  const abrirDialogoAlterarPlano = (usuario) => {
    setUsuarioParaAlterar(usuario);
    // Definir o plano atual como valor inicial
    setNovoPlano(usuario.perfis_usuario.plano_atual.toString());
    setDialogoAlterarPlanoAberto(true);
  };

  const alterarPlanoUsuario = async () => {
    if (!usuarioParaAlterar || !novoPlano) return;
    
    try {
      // Atualizar o plano no perfil do usuário
      const { error: perfilError } = await supabase
        .from('perfis_usuario')
        .update({ plano_atual: parseInt(novoPlano) })
        .eq('id', usuarioParaAlterar.id);
        
      if (perfilError) throw perfilError;
      
      // Se houver uma assinatura ativa, também atualizá-la
      const { data: assinatura, error: assinaturaFindError } = await supabase
        .from('assinaturas')
        .select('id')
        .eq('user_id', usuarioParaAlterar.id)
        .in('status', ['ativa', 'teste'])
        .single();
        
      if (assinatura && !assinaturaFindError) {
        const { error: assinaturaUpdateError } = await supabase
          .from('assinaturas')
          .update({ 
            plano_id: parseInt(novoPlano),
            atualizado_em: new Date().toISOString()
          })
          .eq('id', assinatura.id);
          
        if (assinaturaUpdateError) throw assinaturaUpdateError;
      }
      
      toast.success('Plano do usuário alterado com sucesso');
      
      // Atualizar a lista
      carregarUsuarios();
      setDialogoAlterarPlanoAberto(false);
      setUsuarioParaAlterar(null);
      setNovoPlano('');
    } catch (error) {
      console.error('Erro ao alterar plano do usuário:', error);
      toast.error('Erro ao alterar plano do usuário: ' + error.message);
    }
  };

  const toggleBloqueioUsuario = async (usuario) => {
    const estaBloqueado = usuario.banned_until !== null;
    
    try {
      let data;
      
      if (estaBloqueado) {
        // Desbloquear o usuário
        data = { banned_until: null };
      } else {
        // Bloquear o usuário por 100 anos (efetivamente permanente)
        const dataExpiracao = new Date();
        dataExpiracao.setFullYear(dataExpiracao.getFullYear() + 100);
        data = { banned_until: dataExpiracao.toISOString() };
      }
      
      const { error } = await supabase.auth.admin.updateUserById(
        usuario.id,
        data
      );
      
      if (error) throw error;
      
      toast.success(`Usuário ${estaBloqueado ? 'desbloqueado' : 'bloqueado'} com sucesso`);
      
      // Atualizar a lista
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao alterar status de bloqueio:', error);
      toast.error('Erro ao alterar status de bloqueio: ' + error.message);
    }
  };

  const toggleAdminStatus = async (usuario) => {
    const isAdmin = usuario.perfis_usuario.is_admin;
    
    try {
      const { error } = await supabase
        .from('perfis_usuario')
        .update({ is_admin: !isAdmin })
        .eq('id', usuario.id);
        
      if (error) throw error;
      
      toast.success(`Permissões de administrador ${isAdmin ? 'removidas' : 'concedidas'} com sucesso`);
      
      // Atualizar a lista
      carregarUsuarios();
    } catch (error) {
      console.error('Erro ao alterar permissões de administrador:', error);
      toast.error('Erro ao alterar permissões de administrador: ' + error.message);
    }
  };

  const enviarEmailResetSenha = async (usuario) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        usuario.email,
        { redirectTo: process.env.NEXT_PUBLIC_SITE_URL + '/reset-password' }
      );
      
      if (error) throw error;
      
      toast.success('Email de redefinição de senha enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar email de reset de senha:', error);
      toast.error('Erro ao enviar email de redefinição de senha: ' + error.message);
    }
  };

  return (
    <AdminLayout>
      <Head>
        <title>Gerenciar Usuários | CriaPrompt</title>
      </Head>
      
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Usuários</h1>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Buscar por email ou nome..."
                className="pl-8"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
            
            <Select
              value={filtroPlano}
              onValueChange={setFiltroPlano}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos os planos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os planos</SelectItem>
                {planos.map((plano) => (
                  <SelectItem key={plano.id} value={plano.id.toString()}>
                    {plano.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setTermoBusca('');
                setFiltroPlano('');
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.length > 0 ? (
                    usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                              {usuario.perfis_usuario?.imagem_perfil ? (
                                <img 
                                  src={usuario.perfis_usuario.imagem_perfil}
                                  alt="Perfil"
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <User className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">
                                {usuario.perfis_usuario?.nome_completo || 'Sem nome'}
                              </p>
                              {usuario.perfis_usuario?.is_admin && (
                                <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-sm">
                                  Admin
                                </span>
                              )}
                              {usuario.banned_until && (
                                <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded-sm ml-1">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          {getNomePlano(usuario.perfis_usuario?.plano_atual)}
                        </TableCell>
                        <TableCell>
                          {getStatusAssinatura(usuario)}
                        </TableCell>
                        <TableCell>{formatarData(usuario.created_at)}</TableCell>
                        <TableCell>{formatarData(usuario.last_sign_in_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/usuarios/${usuario.id}`)}>
                                <User className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => abrirDialogoAlterarPlano(usuario)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Alterar plano
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => enviarEmailResetSenha(usuario)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Enviar reset de senha
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem onClick={() => toggleAdminStatus(usuario)}>
                                {usuario.perfis_usuario?.is_admin ? (
                                  <>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Remover admin
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Tornar admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem onClick={() => toggleBloqueioUsuario(usuario)}>
                                {usuario.banned_until ? (
                                  <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Desbloquear
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Bloquear
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => confirmarExclusao(usuario)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {termoBusca || filtroPlano ? (
                          <>Nenhum usuário encontrado com os filtros aplicados.</>
                        ) : (
                          <>Nenhum usuário cadastrado.</>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Página {paginaAtual} de {totalPaginas}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={dialogoExcluirAberto} onOpenChange={setDialogoExcluirAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioParaExcluir?.email}</strong>?
              Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogoExcluirAberto(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={excluirUsuario}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de alteração de plano */}
      <Dialog open={dialogoAlterarPlanoAberto} onOpenChange={setDialogoAlterarPlanoAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano do usuário</DialogTitle>
            <DialogDescription>
              Selecione o novo plano para o usuário <strong>{usuarioParaAlterar?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <Select
              value={novoPlano}
              onValueChange={setNovoPlano}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((plano) => (
                  <SelectItem key={plano.id} value={plano.id.toString()}>
                    {plano.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogoAlterarPlanoAberto(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="default" 
              onClick={alterarPlanoUsuario}
              disabled={!novoPlano}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 