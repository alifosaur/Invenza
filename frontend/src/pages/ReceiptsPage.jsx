import OperationsListPage from '../components/OperationsListPage';
import { ArrowDownToLine } from 'lucide-react';

export default function ReceiptsPage() {
  return (
    <OperationsListPage
      type="IN"
      title="Receipts"
      subtitle="Incoming stock from suppliers"
      icon={ArrowDownToLine}
    />
  );
}
