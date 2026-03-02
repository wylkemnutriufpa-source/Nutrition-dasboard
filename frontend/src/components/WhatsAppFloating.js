import { MessageCircle } from 'lucide-react';

const WhatsAppFloating = ({ phoneNumber = '5511999999999', message = 'Olá! Vim pelo Check Nutricional' }) => {
  const handleClick = () => {
    const formattedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${formattedMessage}`, '_blank');
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={handleClick}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
        
        {/* Pulse animation */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
      </button>

      {/* Tooltip */}
      <div className="fixed bottom-24 right-6 z-50 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
          Fale comigo agora! 💬
        </div>
      </div>
    </>
  );
};

export default WhatsAppFloating;
