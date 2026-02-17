import { Box, Button, Flex, Heading, TextArea } from '@radix-ui/themes';
import { config } from '@src/config/config';
import { useData } from '@src/contexts/DataContext';
import { Note } from '@src/models/entities/Note';
import { useMemo, useState } from 'react';

export function RecipeNoteForm({
  recipeUuid,
  onSubmit,
  onCancel,
}: {
  recipeUuid: string;
  onSubmit?: (note: Note) => void;
  onCancel?: () => void;
}) {
  const [note, setNote] = useState<Note>(
    () =>
      new Note({
        content: '',
        recipeUuid: recipeUuid,
      }),
  );
  const { getRepository } = useData();
  const repository = useMemo(
    () => getRepository(config.ENDPOINTS_CONSTANTS.NOTES),
    [getRepository],
  );

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    await repository.save(note);
    if (onSubmit) {
      onSubmit(note);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2" align="start">
        <Heading as="h3" size="3">
          Ajouter une note sur la recette
        </Heading>
        <Box width="100%">
          <label htmlFor="recipeNote">Note</label>
          <TextArea
            id="recipeNote"
            name="recipeNote"
            value={note.content}
            onChange={(e) => {
              setNote((prev) => {
                const updated = new Note(prev.toData());
                updated.content = e.target.value;
                return updated;
              });
            }}
            rows={4}
            style={{ display: 'block', width: '100%' }}
            maxLength={500}
          />
        </Box>
        <Flex gap="2">
          <Button type="submit" size="2" onClick={handleSubmit}>
            Enregistrer
          </Button>
          <Button variant="surface" size="2" onClick={onCancel}>
            Annuler
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
