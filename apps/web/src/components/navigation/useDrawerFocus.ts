import { useLayoutEffect, type RefObject } from 'react';

const focusableElements = (container: HTMLElement) => Array.from(container.querySelectorAll<HTMLElement>(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]',
)).filter(element => element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length > 0);

const containDrawerFocus = (sidebar: HTMLElement, close: () => void) => {
  const first = () => focusableElements(sidebar)[0] ?? sidebar;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const elements = focusableElements(sidebar);
    const target = event.shiftKey ? elements[elements.length - 1] : elements[0];
    const boundary = event.shiftKey ? elements[0] : elements[elements.length - 1];
    if (!elements.length || document.activeElement === boundary || !sidebar.contains(document.activeElement)) {
      event.preventDefault();
      (target ?? sidebar).focus();
    }
  };
  const onFocus = (event: FocusEvent) => {
    if (!sidebar.contains(event.target as Node)) first().focus();
  };
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('focusin', onFocus);
  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('focusin', onFocus);
  };
};

export const useDrawerFocus = (ref: RefObject<HTMLElement>, open: boolean, close: () => void) => {
  useLayoutEffect(() => {
    const sidebar = ref.current;
    const shell = sidebar?.closest('.management-shell');
    if (!sidebar || !shell) return;
    const mobile = window.matchMedia('(max-width: 1023px)');
    let release: (() => void) | undefined;

    const syncDrawer = () => {
      release?.();
      release = undefined;
      sidebar.inert = mobile.matches && !open;
      if (!mobile.matches || !open) return;

      const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const background = Array.from(shell.querySelectorAll<HTMLElement>('.management-content-wrapper, .skip-link'));
      const priorInert = background.map(element => element.inert);
      const overflow = document.body.style.overflow;
      background.forEach(element => { element.inert = true; });
      document.body.style.overflow = 'hidden';
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      const stopContainment = containDrawerFocus(sidebar, close);
      (sidebar.querySelector<HTMLElement>('button') ?? sidebar).focus();

      release = () => {
        stopContainment();
        background.forEach((element, index) => { element.inert = priorInert[index]; });
        document.body.style.overflow = overflow;
        sidebar.removeAttribute('role');
        sidebar.removeAttribute('aria-modal');
        const fallback = shell.querySelector<HTMLElement>('button[aria-label="Thu gọn menu bên"], button[aria-label="Mở rộng menu bên"]');
        const target = previous?.isConnected && previous.getClientRects().length && !previous.closest('[inert]')
          ? previous : fallback;
        // React restores the pre-commit focus after layout-effect cleanup.
        // Return focus after that commit, unless another drawer has opened.
        queueMicrotask(() => {
          if (sidebar.getAttribute('aria-modal') !== 'true' && target?.isConnected
            && target.getClientRects().length && !target.closest('[inert]')) target.focus();
        });
      };
    };

    syncDrawer();
    mobile.addEventListener('change', syncDrawer);
    return () => {
      mobile.removeEventListener('change', syncDrawer);
      release?.();
      sidebar.inert = false;
    };
  }, [ref, open, close]);
};
