import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus } from '@fortawesome/free-solid-svg-icons';

const IconMinus = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faMinus} className={className} {...props} />;
};

export default IconMinus;
