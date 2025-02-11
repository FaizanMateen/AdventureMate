/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
import { loadStripe } from '@stripe/stripe-js';
 
export const bookTour = async tourId => {
  const stripe = await loadStripe('pk_test_51QmIEHE9c2M8KzCabn2t4q7Mx6eu4kZUiieV2yBXN0LUWOFTKHRMLhhC1wNprEtKLkoojgSvhSHEekQSg4MkOOBQ005ZH5KbkZ');

 
  try {
    // 1) Get Checkout session
    const response = await axios.get(
      `/api/v1/bookings/checkout-session/${tourId}`
    );
    const session = response.data.session;
 
    // 2) Redirect to checkout form
    await stripe.redirectToCheckout({
      sessionId: session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error');
  }
};