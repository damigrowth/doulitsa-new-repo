import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';

const IconQuoteLeft = ({ className = '', ...props }) => {
  return (
    <FontAwesomeIcon icon={faQuoteLeft} className={className} {...props} />
  );
};

export default IconQuoteLeft;
