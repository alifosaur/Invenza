import OperationsListPage from '../components/OperationsListPage';
import { ArrowUpFromLine } from 'lucide-react';

export default function DeliveriesPage() {
  return (
    <OperationsListPage
      type="OUT"
      title="Deliveries"
      subtitle="Outgoing stock to customers"
      icon={ArrowUpFromLine}
    />
  );
}
