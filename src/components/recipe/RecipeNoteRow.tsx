import { TrashIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Flex,
  IconButton,
  Quote,
  Text,
} from '@radix-ui/themes';
import { useData } from '@src/contexts/DataContext';
import { useView } from '@src/contexts/ViewContext';
import { NoteData } from '@src/types/entities';
import { useCallback, useState } from 'react';
import { Notice } from '../ui/Notice';

export function RecipeNoteRow({
  note,
  onDelete,
  ...props
}: {
  note: NoteData;
  onDelete?: (uuid: string) => void;
}) {
  const { openModal, closeModal } = useView();
  const { dataService } = useData();

  const DeleteNoteModal = useCallback(() => {
    const [error, setError] = useState('');

    const deleteNote = async () => {
      try {
        if (!note.uuid) {
          setError('Note invalide ou non spécifiée pour la suppression.');
          return;
        }
        await dataService.notes.delete(note.uuid);

        // Mise à jour locale immédiate (optimistic update)
        onDelete?.(note.uuid);
        closeModal('delete-note');
      } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        setError('Une erreur est survenue lors de la suppression de la note.');
      }
    };

    return (
      <Box>
        {error && <Notice type="error" title={error} />}
        <Flex justify="center" align="center" gap="4" mt="4">
          <Button color="red" onClick={deleteNote}>
            Supprimer
          </Button>
          <Button onClick={() => closeModal('delete-note')}>Annuler</Button>
        </Flex>
      </Box>
    );
  }, [note.uuid, dataService]);

  const handleDeleteNote = () => {
    openModal('delete-note', {
      title: 'Supprimer la note',
      description:
        'Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.',
      titleAlign: 'center',
      descriptionAlign: 'center',
      children: <DeleteNoteModal />,
    });
  };

  return (
    <Flex align="start" gap="2" {...props}>
      <Box asChild flexGrow="1">
        <Card>
          <Text as="p" mt="0">
            <Quote>{note.content}</Quote>
          </Text>
          {note.dateAdd && (
            <Text asChild size="1" color="gray">
              <time>
                {new Date(note.dateAdd).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </Text>
          )}
        </Card>
      </Box>
      <IconButton
        aria-label="Supprimer la note"
        color="red"
        onClick={handleDeleteNote}
      >
        <TrashIcon />
      </IconButton>
    </Flex>
  );
}
