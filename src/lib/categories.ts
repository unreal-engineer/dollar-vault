export const CATEGORY_GROUPS = {
  INCOME: ['Salary', 'Side Hustle', 'Freelance', 'Other Income'],
  SAVINGS: ['BOFA', 'PNC', 'CAP 1'],
  GIVING: ['Church', 'Gifts', 'Donations'],
  HOUSING: [
    'Mortgage',
    'Sewer',
    'Elec/Water/Trash',
    'Gas',
    'Phone',
    'Subscriptions',
    'Internet',
    'Maintenance/Other Housing'
  ],
  VEHICLES: [
    'Insurance',
    'Car Loan',
    'Car Wash',
    'Fuel',
    'Maintenance/Other Vehicle'
  ],
  FOOD: ['Groceries', 'Restaurants'],
  FUN: ['Events/Entertain', 'Hobbies/Crafts'],
  OTHER: [
    'Gym',
    'Investments',
    'Student Loans',
    'Life Insurance',
    'Pets',
    'Other'
  ]
};

export const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flat();
