import { 
  createContext, 
  ReactNode, 
  useContext, 
  useState 
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const cartLocalStorageKey = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(cartLocalStorageKey);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get<Stock>(`stock/${productId}`);
      const availableQuantity = response.data?.amount || 0;

      if (availableQuantity === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        // console.log({productId, availableQuantity});
        return;
      }

      const cartItemIndex = cart.findIndex(item => item.id === productId);
      const cartItemQuantity = cart[cartItemIndex]?.amount || 0;

      if (cartItemQuantity + 1 > availableQuantity) {
        toast.error('Quantidade solicitada fora de estoque');
        // console.log({availableQuantity, cartItemQuantity});
        return;
      }

      const newCart = Object.assign(cart);
      if (cartItemIndex >= 0) {
        newCart.splice(cartItemIndex, 1);
      }

      const productResponse = await api.get<Product>(`products/${productId}`);
      if (!productResponse.data?.id) {
        toast.error('Erro na adição do produto');
        console.log({product: productResponse.data});
        return;
      }
      
      const newItem = {...productResponse.data, amount: cartItemQuantity + 1};
      const finalNewCart = [...newCart, newItem];

      setCart(finalNewCart);
      localStorage.setItem(cartLocalStorageKey, JSON.stringify(finalNewCart));

      // console.log('sucesso', newItem, newCart);
    } catch(err) {
      toast.error('Erro na adição do produto');
      // console.log({err});
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartItemIndex = cart.findIndex(item => item.id === productId);

      if (cartItemIndex < 0) {
        toast.error('Erro na remoção do produto');
        // console.log({cartItemIndex});
        return;
      }

      const newCart = cart.filter(item => item.id !== productId);
      setCart(newCart);
      localStorage.setItem(cartLocalStorageKey, JSON.stringify(newCart));

      // console.log({cart, newCart});
    } catch(err) {
      toast.error('Erro na remoção do produto');
      // console.log({err});
    }
  };

  const updateProductAmount = async ({
    productId,
    amount = 0,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        // console.log({amount});
        return;
      }

      const cartItemIndex = cart.findIndex(item => item.id === productId);

      // if (cartItemIndex < 0) {
      //   toast.error('Item não encontrado no carrinho');
      //   console.log({cartItemIndex});
      //   return;
      // }

      const response = await api.get<Stock>(`stock/${productId}`);
      const availableQuantity = response.data?.amount || 0;

      if (amount > availableQuantity) {
        toast.error('Quantidade solicitada fora de estoque');
        //console.log({cartItemIndex});
        return;
      }

      const newCart = Object.assign(cart);
      const updatedItem = {
        ...newCart[cartItemIndex],
        amount
      }

      newCart[cartItemIndex] = updatedItem;
      setCart([]);
      setCart(newCart);

      localStorage.setItem(cartLocalStorageKey, JSON.stringify(newCart));
      
      // console.log('sucesso', {newCart});
      // toast.success('Quantidade atualizada com sucesso');
    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');
      // console.log({err});
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
