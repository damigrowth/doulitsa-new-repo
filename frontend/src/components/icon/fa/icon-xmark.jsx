import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const IconXmark = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faXmark} className={className} {...props} />;
};

export default IconXmark;
