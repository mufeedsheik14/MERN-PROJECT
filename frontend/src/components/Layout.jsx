import Header from "./Header";
import Footer from "./Footer";
import ChatAssistant from "./ChatAssistant";
import ToastContainer from "./ToastContainer";
import CompareDock from "./CompareDock";
import VehicleCompareModal from "./VehicleCompareModal";
import WishlistDrawer from "./WishlistDrawer";
import QuickViewModal from "./QuickViewModal";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <CompareDock />
      <VehicleCompareModal />
      <WishlistDrawer />
      <QuickViewModal />
      <ToastContainer />
      <ChatAssistant />
      <Footer />
    </div>
  );
}
