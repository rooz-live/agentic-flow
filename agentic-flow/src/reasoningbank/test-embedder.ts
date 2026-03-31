import { HybridReasoningBank } from './HybridBackend';

try {
  const rb = new HybridReasoningBank();
  console.log('Successfully instantiated HybridReasoningBank');
} catch (error) {
  console.error('Error instantiating:', error);
}