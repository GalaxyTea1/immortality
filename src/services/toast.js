import { toast } from 'sonner';

export const showResultToast = (result, fallbackMessage = 'Hoàn tất thao tác') => {
  const message = result?.message || fallbackMessage;
  if (result?.success === false) {
    toast.error(message);
    return;
  }

  toast.success(message);
};

export { toast };
