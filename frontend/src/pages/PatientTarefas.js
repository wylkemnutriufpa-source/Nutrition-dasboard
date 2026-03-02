import Layout from '@/components/Layout';
import ChecklistSimple from '@/components/ChecklistSimple';
import { useAuth } from '@/contexts/AuthContext';

const PatientTarefas = () => {
  const { user } = useAuth();

  return (
    <Layout title="Minhas Tarefas Diárias" userType="patient">
      <div className="max-w-4xl mx-auto">
        <ChecklistSimple patientId={user?.id} isPatientView={true} />
      </div>
    </Layout>
  );
};

export default PatientTarefas;
