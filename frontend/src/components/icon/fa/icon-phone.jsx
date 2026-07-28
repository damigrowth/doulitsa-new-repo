import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone } from '@fortawesome/free-solid-svg-icons';

const IconPhone = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faPhone} className={className} {...props} />;
};

export default IconPhone;
