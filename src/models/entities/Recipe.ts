import { config } from '@src/config/config';
import { RecipeStorage } from '@src/types/storage';
import type {
  DifficultyLevels,
  ImageData,
  NoteData,
  RecipeApi,
  RecipeData,
  RecipeIngredientData,
  RecipeTypeData,
  ValidationRules,
} from '../../types/entities';
import { BaseSyncEntity } from './BaseSyncEntity';

export class Recipe extends BaseSyncEntity {
  private _name: string;
  private _description: string;
  private _tested: number;
  private _favorite: number;
  private _steps: string[];
  private _tags: string[];
  private _timePreparation: number;
  private _timeCook: number;
  private _portions: string;
  private _difficulty: DifficultyLevels;
  private _imageUuid: string;
  private _image: ImageData | null;
  private _imageUrl: string;
  private _ingredients: RecipeIngredientData[];
  private _types: RecipeTypeData[];
  private _notes: NoteData[];

  constructor(data: Partial<RecipeData> = {}, asUpdate: boolean = false) {
    super(data, asUpdate);

    this._name = data.name || '';
    this._tested = data.tested || 0;
    this._favorite = data.favorite || 0;
    this._description = data.description || '';
    this._steps = data.steps || [];
    this._tags = data.tags || [];
    this._timePreparation = data.timePreparation
      ? parseInt(String(data.timePreparation))
      : 0;
    this._timeCook = data.timeCook ? parseInt(String(data.timeCook)) : 0;
    this._portions = data.portions || '';
    this._difficulty = data.difficulty || config.DIFFICULTY_LEVELS[0];
    this._imageUuid = data.imageUuid || '';
    this._imageUrl = data.imageUrl || '';
    this._image = data.image || null;
    this._ingredients = data.ingredients || [];
    this._types = data.types || [];
    this._notes = data.notes || [];
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get tested(): number {
    return this._tested;
  }

  get favorite(): number {
    return this._favorite;
  }

  get steps(): string[] {
    return this._steps;
  }

  get tags(): string[] {
    return this._tags;
  }

  get timePreparation(): number {
    return this._timePreparation;
  }

  get timeCook(): number {
    return this._timeCook;
  }

  get portions(): string {
    return this._portions;
  }

  get difficulty(): DifficultyLevels {
    return this._difficulty;
  }

  get imageUuid(): string {
    return this._imageUuid;
  }

  get image(): ImageData | null {
    return this._image;
  }

  get imageUrl(): string {
    return this._imageUrl;
  }

  get ingredients(): RecipeIngredientData[] {
    return this._ingredients;
  }

  get types(): RecipeTypeData[] {
    return this._types;
  }

  get notes(): NoteData[] {
    return this._notes;
  }

  // Setters
  set name(value: string) {
    this._name = value;
    this.markChanged('name');
  }

  set description(value: string) {
    this._description = value;
    this.markChanged('description');
  }

  set tested(value: number) {
    this._tested = value;
    this.markChanged('tested');
  }

  set favorite(value: number) {
    this._favorite = value;
    this.markChanged('favorite');
  }

  set steps(value: string[]) {
    this._steps = value;
    this.markChanged('steps');
  }

  set tags(value: string[]) {
    this._tags = value;
    this.markChanged('tags');
  }

  set timePreparation(value: number) {
    this._timePreparation = value;
    this.markChanged('timePreparation');
  }

  set timeCook(value: number) {
    this._timeCook = value;
    this.markChanged('timeCook');
  }

  set portions(value: string) {
    this._portions = value;
    this.markChanged('portions');
  }

  set difficulty(value: DifficultyLevels) {
    this._difficulty = value;
    this.markChanged('difficulty');
  }

  set imageUuid(value: string) {
    this._imageUuid = value;
    this.markChanged('imageUuid');
  }

  set image(value: ImageData | null) {
    this._image = value;
    this.markChanged('image');
  }

  set imageUrl(value: string) {
    this._imageUrl = value;
    this.markChanged('imageUrl');
  }

  set ingredients(value: RecipeIngredientData[]) {
    this._ingredients = value;
    this.markChanged('ingredients');
  }

  set types(value: RecipeTypeData[]) {
    this._types = value;
    this.markChanged('types');
  }

  set notes(value: NoteData[]) {
    this._notes = value;
    this.markChanged('notes');
  }

  get totalTime(): number {
    return this._timePreparation + this._timeCook;
  }

  setImage(image: ImageData | null): void {
    this._image = image;
    this._imageUuid = image ? image.uuid || '' : '';
    this.markFieldsChanged(['image', 'imageUuid']);
  }

  /**
   * Array mutators with change tracking
   */
  addIngredient(
    ingredient: Partial<Omit<RecipeIngredientData, 'uuid'>> = {},
  ): void {
    this._ingredients.push({
      uuid: '',
      ingredientUuid: ingredient.ingredientUuid || '',
      quantity: ingredient.quantity || 0,
      unit: ingredient.unit || '',
      note: ingredient.note || '',
    });
    this.markChanged('ingredients');
  }

  removeIngredient(index: number): void {
    if (this._ingredients.length > 1) {
      this._ingredients.splice(index, 1);
      this.markChanged('ingredients');
    }
  }

  addStep(step: string = ''): void {
    this._steps.push(step);
    this.markChanged('steps');
  }

  removeStep(index: number): void {
    if (this._steps.length > 1) {
      this._steps.splice(index, 1);
      this.markChanged('steps');
    }
  }

  /**
   * Get valid ingredients (filter empty ones)
   */
  getValidIngredients(): RecipeIngredientData[] {
    return this._ingredients.filter((ing) => ing.ingredientUuid || ing.note);
  }

  /**
   * Validation rules
   */
  validationRules(): ValidationRules {
    return {
      name: [
        {
          condition: this.name.trim().length === 0,
          message: 'Recipe name is required',
        },
        {
          condition: this.name.length > 255,
          message: 'Recipe name cannot exceed 255 characters',
        },
      ],
      difficulty: [
        {
          condition: !config.DIFFICULTY_LEVELS.includes(this.difficulty),
          message: 'Difficulty must be: easy, medium or hard',
        },
      ],
      timePreparation: [
        {
          condition: this.timePreparation < 0,
          message: 'Preparation time cannot be negative',
        },
      ],
      timeCook: [
        {
          condition: this.timeCook < 0,
          message: 'Cooking time cannot be negative',
        },
      ],
    };
  }

  /**
   * Checks if recipe contains an ingredient
   */
  hasIngredient(ingredientName: string): boolean {
    return this.ingredients.some((ing) =>
      ing.name?.toLowerCase().includes(ingredientName.toLowerCase()),
    );
  }

  /**
   * Checks if recipe has a specific tag
   */
  hasTag(tagName: string): boolean {
    return this.tags.some((tag) =>
      tag.toLowerCase().includes(tagName.toLowerCase()),
    );
  }

  get baseFields(): RecipeStorage {
    return {
      ...super.baseFields,
      name: this.name,
      tested: this.tested,
      favorite: this.favorite,
      description: this.description,
      steps: this.steps,
      tags: this.tags,
      timePreparation: this.timePreparation,
      timeCook: this.timeCook,
      portions: String(this.portions),
      difficulty: this.difficulty,
      imageUuid: this.imageUuid,
    };
  }

  toData(): RecipeData {
    return {
      ...super.toData(),
      ...this.baseFields,
      image: this.image,
      imageUrl: this.imageUrl,
      ingredients: this.ingredients,
      types: this.types,
      notes: this.notes,
    };
  }

  toStorage(): RecipeStorage {
    return this.baseFields;
  }

  toApi(): RecipeApi {
    const recipeDependencies = {
      ingredients: this.ingredients.map((ing) => ({
        ingredient: ing.ingredient ? ing.ingredient.toApi() : undefined,
        ingredientUuid: ing.ingredientUuid,
        quantity: ing.quantity,
        unit: ing.unit,
        note: ing.note,
      })),
      types: this.types.map((type) => ({
        type: type.type ? type.type.toApi() : undefined,
        typeUuid: type.typeUuid,
      })),
    };

    return {
      uuid: this.uuid,
      name: this.name,
      tested: this.tested === 1,
      favorite: this.favorite === 1,
      description: this.description,
      steps: this.steps,
      tags: this.tags,
      timePreparation: this.timePreparation,
      timeCook: this.timeCook,
      portions: this.portions,
      difficulty: this.difficulty,
      imageUuid: this.imageUuid,
      dateAdd: this.dateAdd,
      dateModify: this.dateModify,
      dateDeleted: this.dateDeleted,
      version: this.version,
      ...recipeDependencies,
      notes: this.notes,
    };
  }
}
