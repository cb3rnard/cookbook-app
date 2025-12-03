import {
  GearIcon,
  Link1Icon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, IconButton } from "@radix-ui/themes";
import { useCallback, useEffect, useState } from "react";
import { useApi } from "../../contexts";
import { useView } from "../../contexts/ViewContext";

export function AppActions({ handleToggleSidebar }) {
  const { openRecipeForm, openUrlImport, openSettings } = useView();
  const [createOptionsOpen, setCreateOptionsOpen] = useState(false);
  const { connection } = useApi();
  const { authenticated } = connection;
  const { toggleSidebar } = useView();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".app__actions-create-options")) {
        setCreateOptionsOpen(false);
      }
    };
    if (createOptionsOpen) {
      document.addEventListener("click", handleClickOutside);
    } else {
      document.removeEventListener("click", handleClickOutside);
    }
  }, [createOptionsOpen]);

  const handleNewRecipe = () => {
    openRecipeForm();
  };

  const handleImportRecipeFromUrl = () => {
    openUrlImport();
  };

  const handleAddRecipe = useCallback(
    (e) => {
      e.stopPropagation();
      if (authenticated) {
        setCreateOptionsOpen(!createOptionsOpen);
      } else {
        handleNewRecipe();
      }
    },
    [createOptionsOpen, authenticated],
  );

  return (
    <Flex
      className="app__actions"
      gap="3"
      p="2"
      style={{
        backgroundColor: "var(--iris-a5)",
        borderRadius: "99999px",
      }}
    >
      {/* Création de recette */}
      <Flex direction={"column"} align="center">
        {authenticated && createOptionsOpen && (
          <Flex
            direction="column"
            gap="1"
            position="absolute"
            bottom="calc(100% + .25rem)"
          >
            {/* Création */}
            <IconButton onClick={handleNewRecipe} size="4" radius="full">
              <Pencil2Icon />
            </IconButton>
            {/* Import web */}
            <IconButton
              onClick={handleImportRecipeFromUrl}
              size="4"
              radius="full"
            >
              <Link1Icon />
            </IconButton>
          </Flex>
        )}
        <IconButton onClick={handleAddRecipe} size="4" radius="full">
          <PlusIcon />
        </IconButton>
      </Flex>

      {/* Sidebar filtres & recherches (mobile) */}
      <Box asChild display={{ initial: "block", sm: "none" }}>
        <IconButton onClick={toggleSidebar} size="4" radius="full">
          <MagnifyingGlassIcon />
        </IconButton>
      </Box>

      {/* Options */}
      <IconButton
        onClick={() => openSettings()}
        size="4"
        color="gray"
        radius="full"
        highContrast
      >
        <GearIcon />
      </IconButton>
    </Flex>
  );
}
