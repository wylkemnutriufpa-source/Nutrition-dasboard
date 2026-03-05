import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import EmergencyModal from './EmergencyModal';

/**
 * Botão Floating de Emergência (SOS)
 * Aparece fixo no canto inferior direito para pacientes
 */
const EmergencyButton = ({ patientId, professionalId }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Botão Floating */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowModal(true)}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-110 animate-pulse"
          title="Preciso de ajuda urgente!"
        >
          <div className="flex flex-col items-center">
            <AlertCircle className="h-7 w-7 text-white" />
            <span className="text-xs font-bold text-white mt-0.5">SOS</span>
          </div>
        </Button>
      </div>

      {/* Modal */}
      <EmergencyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        patientId={patientId}
        professionalId={professionalId}
      />
    </>
  );
};

export default EmergencyButton;
