import { Box, Button, Flex, Heading, TextArea } from '@radix-ui/themes';
import { useMemo, useState } from 'react';
import { useData } from '../../contexts';

export function RecipeNoteForm({ recipeUuid, onSubmit = null, onCancel = null, value = '' }) {
  const [noteData, setNoteData] = useState({ content: null, recipeUuid });
  const { getRepository } = useData();
  const repository = useMemo(() => getRepository('recipeNotes'), [getRepository]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const savedNote = await repository.save(noteData);
    if (onSubmit) {
      onSubmit(savedNote);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2" align="start">
        <Heading as="h3" size="3">Ajouter une note sur la recette</Heading>
        <Box width="100%">
          <label htmlFor="recipeNote">Note</label>
          <TextArea
            id="recipeNote"
            name='recipeNote'
            onChange={(e) => setNoteData({ ...noteData, content: e.target.value })}
            rows="4"
            style={{ display: 'block', width: '100%' }}
            maxLength="500"
          />
        </Box>
        <Flex gap="2">
          <Button type="submit" size="2" onClick={handleSubmit}>Enregistrer</Button>
          <Button variant="surface" size="2" onClick={onCancel}>Annuler</Button>
        </Flex>
      </Flex>
    </form>
  );
}