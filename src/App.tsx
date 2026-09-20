import { Routes, Route } from "react-router-dom";
import { CartProvider } from "@/hooks/use-cart";
import { ToastProvider } from "@/hooks/use-toast";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/Toaster";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Layout } from "@/components/Layout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CuentaLayout } from "@/components/customer/CuentaLayout";
import { Home } from "@/pages/Home";
import { Productos } from "@/pages/Productos";
import { ProductoDetail } from "@/pages/ProductoDetail";
import { Orcamento } from "@/pages/Orcamento";
import { SobreNosotros } from "@/pages/SobreNosotros";
import { Contacto } from "@/pages/Contacto";
import { PoliticaPrivacidad } from "@/pages/PoliticaPrivacidad";
import { TerminosCondiciones } from "@/pages/TerminosCondiciones";
import { PoliticaDevoluciones } from "@/pages/PoliticaDevoluciones";
import { Carrito } from "@/pages/Carrito";
import { PedidoConfirmado } from "@/pages/PedidoConfirmado";
import { Registro } from "@/pages/Registro";
import { Login } from "@/pages/Login";
import { RecuperarPassword } from "@/pages/RecuperarPassword";
import { RestablecerPassword } from "@/pages/RestablecerPassword";
import { CuentaResumen } from "@/pages/cuenta/CuentaResumen";
import { CuentaPerfil } from "@/pages/cuenta/CuentaPerfil";
import { CuentaPedidos } from "@/pages/cuenta/CuentaPedidos";
import { CuentaPedidoDetail } from "@/pages/cuenta/CuentaPedidoDetail";
import { CuentaOrcamentos } from "@/pages/cuenta/CuentaOrcamentos";
import { CuentaSoporte } from "@/pages/cuenta/CuentaSoporte";
import { CuentaValoraciones } from "@/pages/cuenta/CuentaValoraciones";
import { AdminLogin } from "@/pages/admin/AdminLogin";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminOrders } from "@/pages/admin/AdminOrders";
import { AdminOrderDetail } from "@/pages/admin/AdminOrderDetail";
import { AdminProducts } from "@/pages/admin/AdminProducts";
import { AdminProductForm } from "@/pages/admin/AdminProductForm";
import { AdminCategories } from "@/pages/admin/AdminCategories";
import { AdminCustomers } from "@/pages/admin/AdminCustomers";
import { AdminShipping } from "@/pages/admin/AdminShipping";
import { AdminPromotions } from "@/pages/admin/AdminPromotions";
import { AdminQuotes } from "@/pages/admin/AdminQuotes";
import { AdminHandleModels } from "@/pages/admin/AdminHandleModels";
import { AdminGallery } from "@/pages/admin/AdminGallery";
import { AdminUsers } from "@/pages/admin/AdminUsers";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="produtos" element={<Productos />} />
              <Route path="produto/:slug" element={<ProductoDetail />} />
              <Route path="orcamento" element={<Orcamento />} />
              <Route path="sobre-nos" element={<SobreNosotros />} />
              <Route path="contato" element={<Contacto />} />
              <Route path="privacidade" element={<PoliticaPrivacidad />} />
              <Route path="termos" element={<TerminosCondiciones />} />
              <Route path="devolucoes" element={<PoliticaDevoluciones />} />
              <Route path="carrinho" element={<Carrito />} />
              <Route path="pedido-confirmado" element={<PedidoConfirmado />} />
              <Route path="cadastro" element={<Registro />} />
              <Route path="login" element={<Login />} />
              <Route path="recuperar-senha" element={<RecuperarPassword />} />
              <Route path="redefinir-senha" element={<RestablecerPassword />} />
              <Route path="conta" element={<CuentaLayout />}>
                <Route index element={<CuentaResumen />} />
                <Route path="perfil" element={<CuentaPerfil />} />
                <Route path="pedidos" element={<CuentaPedidos />} />
                <Route path="pedidos/:id" element={<CuentaPedidoDetail />} />
                <Route path="orcamentos" element={<CuentaOrcamentos />} />
                <Route path="suporte" element={<CuentaSoporte />} />
                <Route path="avaliacoes" element={<CuentaValoraciones />} />
              </Route>
            </Route>

            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="pedidos/:id" element={<AdminOrderDetail />} />
              <Route path="produtos" element={<AdminProducts />} />
              <Route path="produtos/novo" element={<AdminProductForm />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="clientes" element={<AdminCustomers />} />
              <Route path="entregas" element={<AdminShipping />} />
              <Route path="promocoes" element={<AdminPromotions />} />
              <Route path="fotos-clientes" element={<AdminGallery />} />
              <Route path="orcamentos" element={<AdminQuotes />} />
              <Route path="modelos-de-alca" element={<AdminHandleModels />} />
              <Route path="usuarios" element={<AdminUsers />} />
            </Route>
          </Routes>
          <Toaster />
        </CartProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
