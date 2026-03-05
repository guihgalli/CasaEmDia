import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contextos/AuthContext";
import Layout from "./components/Layout";
import Login from "./paginas/Login";
import Cadastro from "./paginas/Cadastro";
import RecuperarSenha from "./paginas/RecuperarSenha";
import Dashboard from "./paginas/Dashboard";
import Receitas from "./paginas/Receitas";
import DespesasFixas from "./paginas/DespesasFixas";
import DespesasExtras from "./paginas/DespesasExtras";
import EscanearNota from "./paginas/EscanearNota";
import MinhaCasa from "./paginas/MinhaCasa";

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) return <div className="container">Carregando...</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route
        path="/"
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="receitas" element={<Receitas />} />
        <Route path="despesas-fixas" element={<DespesasFixas />} />
        <Route path="despesas-extras" element={<DespesasExtras />} />
        <Route path="escanear-nota" element={<EscanearNota />} />
        <Route path="casa" element={<MinhaCasa />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
