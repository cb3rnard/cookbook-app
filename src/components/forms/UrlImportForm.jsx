import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Flex, Spinner, TextField } from "@radix-ui/themes";
import { useState } from "react";
import { UrlImporter } from "../../services/UrlImporter";
import { Notice } from "../ui/Notice";

export const UrlImportForm = ({ onReceive }) => {
  const [url, setUrl] = useState("");
  const [validUrl, setValidUrl] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validation d'URL plus permissive qui gère les virgules et autres caractères spéciaux
  const validateUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      // Vérifier que c'est bien http ou https
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
      // Si l'URL n'a pas de protocole, essayer d'ajouter https://
      if (
        !urlString.startsWith("http://") &&
        !urlString.startsWith("https://")
      ) {
        try {
          const url = new URL("https://" + urlString);
          return url.protocol === "https:";
        } catch (error) {
          return false;
        }
      }
      return false;
    }
  };

  const handleChange = (e) => {
    const inputUrl = e.target.value;
    setUrl(inputUrl);
    setValidUrl(validateUrl(inputUrl));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!url || !validateUrl(url)) {
      setError("Vérifiez l'URL.");
      return;
    }

    try {
      setIsLoading(true);

      // Normaliser l'URL (ajouter https:// si nécessaire)
      let normalizedUrl = url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        normalizedUrl = "https://" + url;
      }

      const recipes = await UrlImporter.importRecipeFromUrl(normalizedUrl);
      if (recipes.length === 0) {
        setError("Aucune recette trouvée à cette URL.");
        return;
      }
      onReceive(recipes);
    } catch (err) {
      setError(`Échec de l'import. Vérifiez l'URL et réessayez.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <label className="label" htmlFor="url">
          Url des recettes à importer *
        </label>
        <TextField.Root
          name="url"
          id="url"
          placeholder="https://example.com/recipe"
          onChange={handleChange}
          disabled={isLoading}
          error={error}
        >
          <TextField.Slot>
            {isLoading ? <Spinner size="2" /> : <MagnifyingGlassIcon />}
          </TextField.Slot>
        </TextField.Root>
        {error && <Notice type="warning" title={error} />}
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isLoading || !url || !validUrl}
        >
          Importer
        </Button>
      </Flex>
    </form>
  );
};
