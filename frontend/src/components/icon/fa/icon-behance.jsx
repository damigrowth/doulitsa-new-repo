import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBehance } from '@fortawesome/free-brands-svg-icons';

const IconBehance = ({ className = '', ...props }) => {
  return <FontAwesomeIcon icon={faBehance} className={className} {...props} />;
};

export default IconBehance;
