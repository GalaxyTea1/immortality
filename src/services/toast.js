import { toast } from 'sonner';

export const showResultToast = (result, fallbackMessage = 'Action completed') => {
  const message = result?.message || fallbackMessage;
  if (result?.success === false) {
    toast.error(message);
    return;
  }

  toast.success(message);
};

export { toast };
