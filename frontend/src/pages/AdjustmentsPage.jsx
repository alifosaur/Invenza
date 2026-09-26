import OperationsListPage from '../components/OperationsListPage';
import { ClipboardList } from 'lucide-react';

export default function AdjustmentsPage() {
  return (
    <OperationsListPage
      type="ADJUSTMENT"
      title="Adjustments"
      subtitle="Physical count reconciliation"
      icon={ClipboardList}
    />
  );
}
