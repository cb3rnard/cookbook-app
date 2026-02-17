import { Flex } from '@radix-ui/themes';
import { useView } from '../../contexts/ViewContext';
import { Modal } from '../ui/Modal';
import { Notice } from '../ui/Notice';

export function GlobalUI() {
  const { notices, modals, removeNotice, closeModal } = useView();

  return (
    <>
      {/* Rendu des notices/toasts */}
      <Flex
        position="fixed"
        top="4"
        right="4"
        direction="column"
        gap="2"
        style={{ zIndex: 1000 }}
      >
        {notices.map((notice) => (
          <Notice
            {...notice}
            key={notice.id}
            onDismiss={() => notice.id && removeNotice(notice.id)}
          />
        ))}
      </Flex>

      {/* Rendu des modals */}
      {modals.map((modal) => (
        <Modal key={modal.id} {...modal} onClose={() => closeModal(modal.id)}>
          {modal.children}
        </Modal>
      ))}
    </>
  );
}
