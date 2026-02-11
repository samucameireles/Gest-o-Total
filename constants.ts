import { Product, Ingredient, RecipeMap, Driver, AddOn } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Prime Classic',
    description: 'Blend 180g, queijo cheddar, bacon, cebola caramelizada e molho da casa.',
    price: 38.00,
    category: 'BURGER',
    image: 'https://picsum.photos/id/292/400/300',
    allowObservations: true,
    allowedAddOns: ['ao1', 'ao2', 'ao3']
  },
  {
    id: 'p2',
    name: 'Blue Cheese Royal',
    description: 'Blend 180g, gorgonzola cremoso, rúcula e mel picante.',
    price: 42.00,
    category: 'BURGER',
    image: 'https://picsum.photos/id/1080/400/300',
    allowObservations: true,
    allowedAddOns: ['ao1', 'ao2']
  },
  {
    id: 'p3',
    name: 'Crispy Chicken',
    description: 'Frango empanado crocante, alface americana e maionese de limão.',
    price: 34.00,
    category: 'BURGER',
    image: 'https://picsum.photos/id/835/400/300',
    allowObservations: true,
    allowedAddOns: ['ao2', 'ao3']
  },
  {
    id: 'p4',
    name: 'Batata Rústica',
    description: 'Batatas cortadas grosseiramente com alecrim e alho.',
    price: 18.00,
    category: 'SIDE',
    image: 'https://picsum.photos/id/491/400/300',
    allowObservations: true,
    allowedAddOns: ['ao2', 'ao3']
  },
  {
    id: 'p5',
    name: 'Onion Rings',
    description: 'Anéis de cebola empanados.',
    price: 22.00,
    category: 'SIDE',
    image: 'https://picsum.photos/id/312/400/300',
    allowObservations: true,
    allowedAddOns: ['ao3']
  },
  {
    id: 'p6',
    name: 'Coca-Cola Lata',
    description: '350ml',
    price: 6.00,
    category: 'DRINK',
    image: 'https://picsum.photos/id/437/400/300',
    allowObservations: false
  },
  {
    id: 'p7',
    name: 'Cerveja Artesanal IPA',
    description: '500ml',
    price: 24.00,
    category: 'DRINK',
    image: 'https://picsum.photos/id/326/400/300',
    allowObservations: false
  },
  {
    id: 'p8',
    name: 'Brownie Supremo',
    description: 'Com sorvete de baunilha e calda quente.',
    price: 26.00,
    category: 'DESSERT',
    image: 'https://picsum.photos/id/23/400/300',
    allowObservations: true
  }
];

export const INITIAL_INVENTORY: Ingredient[] = [
  { id: 'i1', name: 'Pão Brioche', unit: 'un', currentStock: 50, minThreshold: 10 },
  { id: 'i2', name: 'Blend Bovino 180g', unit: 'un', currentStock: 40, minThreshold: 10 },
  { id: 'i3', name: 'Queijo Cheddar', unit: 'fatia', currentStock: 100, minThreshold: 20 },
  { id: 'i4', name: 'Bacon', unit: 'fatia', currentStock: 80, minThreshold: 20 },
  { id: 'i5', name: 'Coca-Cola Lata', unit: 'un', currentStock: 20, minThreshold: 12 },
  { id: 'i6', name: 'Batata (kg)', unit: 'kg', currentStock: 10, minThreshold: 2 },
  { id: 'i7', name: 'Frango Empanado', unit: 'un', currentStock: 15, minThreshold: 5 },
];

// V12: Default AddOns
export const INITIAL_ADDONS: AddOn[] = [
  { id: 'ao1', name: 'Bacon Extra', price: 4.00 },
  { id: 'ao2', name: 'Queijo Extra', price: 3.50 },
  { id: 'ao3', name: 'Molho Especial', price: 2.00 },
  { id: 'ao4', name: 'Hambúrguer Extra', price: 8.00 },
];

export const RECIPES: RecipeMap = {
  'p1': [
    { ingredientId: 'i1', amount: 1 },
    { ingredientId: 'i2', amount: 1 },
    { ingredientId: 'i3', amount: 2 },
    { ingredientId: 'i4', amount: 3 },
  ],
  'p3': [
    { ingredientId: 'i1', amount: 1 },
    { ingredientId: 'i7', amount: 1 },
  ],
  'p4': [
    { ingredientId: 'i6', amount: 0.4 }, // 400g
  ],
  'p6': [
    { ingredientId: 'i5', amount: 1 },
  ]
};

export const DRIVERS: Driver[] = [
  { id: 'd1', name: 'João Silva', active: true, deliveriesCount: 0, commissionTotal: 0 },
  { id: 'd2', name: 'Maria Souza', active: true, deliveriesCount: 0, commissionTotal: 0 },
  { id: 'd3', name: 'Pedro Santos', active: false, deliveriesCount: 0, commissionTotal: 0 },
];

export const DELIVERY_COMMISSION = 5.00;