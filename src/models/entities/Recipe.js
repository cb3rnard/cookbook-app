import { BaseSyncEntity } from "./BaseSyncEntity";

export class Recipe extends BaseSyncEntity {
  constructor(data = {}) {
    super(data);

    this.name = data.name || "";
    this._tested =
      data._tested !== undefined ? data._tested : data.tested ? 1 : 0;
    this._favorite =
      data._favorite !== undefined ? data._favorite : data.favorite ? 1 : 0;
    this.description = data.description || "";
    this.steps = data.steps || [];
    this.tags = data.tags || [];
    this.timePreparation = data.timePreparation
      ? parseInt(data.timePreparation)
      : 0;
    this.timeCook = data.timeCook ? parseInt(data.timeCook) : 0;
    this.portions = data.portions || "";
    this.difficulty = ["easy", "medium", "hard"].includes(data.difficulty)
      ? data.difficulty
      : "easy";
    this.imageUuid = data.imageUuid || null;
    this.imageUrl = data.imageUrl || null;
    this.image = data.image || null;
    this.ingredients = data.ingredients || [];
    this.types = data.types || [];
    this.notes = data.notes || [];
  }

  get favorite() {
    return Boolean(this._favorite);
  }

  set favorite(value) {
    this._favorite = value ? 1 : 0;
  }

  get tested() {
    return Boolean(this._tested);
  }

  set tested(value) {
    this._tested = value ? 1 : 0;
  }

  get totalTime() {
    return parseInt(this.timePreparation) + parseInt(this.timeCook);
  }

  setImage(image) {
    this.image = image;
    this.imageUuid = image ? image.uuid : null;
  }

  /**
   * Règles de validation
   */
  validationRules() {
    return {
      name: [
        {
          condition: !this.name || this.name.trim().length === 0,
          message: "Le nom de la recette est obligatoire",
        },
        {
          condition: this.name && this.name.length > 255,
          message: "Le nom de la recette ne peut pas dépasser 255 caractères",
        },
      ],
      difficulty: [
        {
          condition: !["easy", "medium", "hard"].includes(this.difficulty),
          message: "La difficulté doit être : facile, moyen ou difficile",
        },
      ],
      timePreparation: [
        {
          condition: this.timePreparation < 0,
          message: "Le temps de préparation ne peut pas être négatif",
        },
      ],
      timeCook: [
        {
          condition: this.timeCook < 0,
          message: "Le temps de cuisson ne peut pas être négatif",
        },
      ],
    };
  }

  /**
   * Vérifie si la recette contient un ingrédient
   */
  hasIngredient(ingredientName) {
    return this.ingredients.some((ing) =>
      ing.name?.toLowerCase().includes(ingredientName.toLowerCase()),
    );
  }

  /**
   * Vérifie si la recette a un tag spécifique
   */
  hasTag(tagName) {
    return this.tags.some((tag) =>
      tag.toLowerCase().includes(tagName.toLowerCase()),
    );
  }

  /**
   * Prépare les données pour la sauvegarde (override de BaseEntity)
   * Exclu les propriétés sans correspondance dans la base de données : ingredients, types, notes
   */
  toStorage() {
    return {
      ...super.toStorage(),
      uuid: this.uuid || null,
      name: this.name,
      tested: this._tested,
      favorite: this._favorite,
      description: this.description,
      steps: this.steps,
      tags: this.tags,
      timePreparation: this.timePreparation,
      timeCook: this.timeCook,
      portions: String(this.portions),
      difficulty: this.difficulty ? this.difficulty.toLowerCase() : "easy",
      imageUuid: this.imageUuid,
    };
  }

  toApi() {
    return {
      ...super.toApi(),
      uuid: this.uuid || null,
      name: this.name,
      tested: this.tested ? true : false,
      favorite: this.favorite ? true : false,
      description: this.description,
      steps: this.steps,
      tags: this.tags,
      timePreparation: parseInt(this.timePreparation, 10),
      timeCook: parseInt(this.timeCook, 10),
      portions: String(this.portions),
      difficulty: this.difficulty ? this.difficulty.toLowerCase() : "easy",
      imageUuid: this.imageUuid,
      ingredients: this.ingredients.map((ing) => ({
        ingredientUuid: ing.ingredientUuid || null,
        quantity: parseInt(ing.quantity) || 0,
        unit: ing.unit || "",
        note: ing.note || "",
      })),
      types: this.types.map((type) => ({
        typeUuid: type.typeUuid || null,
      })),
      notes: this.notes.map((note) => ({
        uuid: note.uuid || null,
        content: note.content || "",
        dateAdd: note.dateAdd || new Date().toISOString(),
      })),
    };
  }
}
