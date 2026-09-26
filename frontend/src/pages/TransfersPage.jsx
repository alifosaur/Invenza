import OperationsListPage from '../components/OperationsListPage';
import { ArrowLeftRight } from 'lucide-react';

export default function TransfersPage() {
  return (
    <OperationsListPage
      type="TRANSFER"
      title="Transfers"
      subtitle="Internal stock movements between locations"
      icon={ArrowLeftRight}
    />
  );
}
