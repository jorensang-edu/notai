export type AccountDomainType = 'docente' | 'tutor' | 'estudiante' | 'admin' | 'unknown';

export interface EmailValidationResult {
  isValid: boolean;
  domainType: AccountDomainType;
  errorMessage?: string;
}

const ADMIN_EMAIL = 'jorensang@gmail.com';

/**
 * Categorizes an email address according to institutional domains:
 * - Docentes/Tutores: @cedfi.edu.ec
 * - Estudiantes: @stu.cedfi.edu.ec
 * - Administrador/Pruebas: jorensang@gmail.com
 */
export function getEmailDomainType(email?: string | null): AccountDomainType {
  if (!email) return 'unknown';
  const clean = email.toLowerCase().trim();
  if (clean === ADMIN_EMAIL) return 'admin';
  if (clean.endsWith('@cedfi.edu.ec')) return 'docente';
  if (clean.endsWith('@stu.cedfi.edu.ec')) return 'estudiante';
  return 'unknown';
}

/**
 * Validates whether the authenticated Google account email meets the domain requirements
 * for the intended role.
 */
export function validateEmailForRole(email: string | null | undefined, targetRole: 'docente' | 'tutor' | 'estudiante'): EmailValidationResult {
  if (!email) {
    return {
      isValid: false,
      domainType: 'unknown',
      errorMessage: 'No se ha detectado una sesión de Google activa. Por favor, inicie sesión.'
    };
  }

  const domainType = getEmailDomainType(email);

  // Administrative bypass for testing environment
  if (domainType === 'admin') {
    return { isValid: true, domainType: 'admin' };
  }

  if (targetRole === 'docente' || targetRole === 'tutor') {
    if (domainType === 'docente') {
      return { isValid: true, domainType: 'docente' };
    }
    if (domainType === 'estudiante') {
      return {
        isValid: false,
        domainType: 'estudiante',
        errorMessage: 'Acceso denegado: El correo con dominio @stu.cedfi.edu.ec pertenece al portal estudiantil y no puede acceder al rol de ' + (targetRole === 'tutor' ? 'Tutor' : 'Docente') + '.'
      };
    }
    return {
      isValid: false,
      domainType: 'unknown',
      errorMessage: 'Dominio no institucional: Se requiere una cuenta institucional @cedfi.edu.ec para ingresar como ' + (targetRole === 'tutor' ? 'Tutor' : 'Docente') + '.'
    };
  }

  if (targetRole === 'estudiante') {
    if (domainType === 'estudiante') {
      return { isValid: true, domainType: 'estudiante' };
    }
    if (domainType === 'docente') {
      return { isValid: true, domainType: 'docente' };
    }
    return {
      isValid: false,
      domainType: 'unknown',
      errorMessage: 'Dominio no institucional: Se requiere una cuenta institucional (@stu.cedfi.edu.ec para estudiantes o @cedfi.edu.ec para docentes/tutores).'
    };
  }

  return {
    isValid: false,
    domainType: 'unknown',
    errorMessage: 'No se pudo verificar el tipo de cuenta institucional.'
  };
}

/**
 * Manages email-to-code bindings to ensure a single institutional account
 * cannot hijack another user or student's profile.
 */
const BINDINGS_KEY = 'notai_user_code_bindings';

interface StoredBinding {
  email: string;
  code: string;
  role: 'docente' | 'tutor' | 'estudiante';
  timestamp: number;
}

export function getStoredBindings(): StoredBinding[] {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function checkCodeBinding(
  email: string, 
  code: string, 
  role: 'docente' | 'tutor' | 'estudiante'
): { allowed: boolean; message?: string } {
  // Admin bypass
  if (email.toLowerCase().trim() === ADMIN_EMAIL) {
    return { allowed: true };
  }

  // Teachers/Tutors accessing student view can inspect any student without being locked
  if (role === 'estudiante' && (getEmailDomainType(email) === 'docente' || getEmailDomainType(email) === 'admin')) {
    return { allowed: true };
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.toUpperCase().trim();
  const bindings = getStoredBindings();

  // If code is already bound to a different email
  const existingCodeBinding = bindings.find(b => b.code === cleanCode && b.role === role);
  if (existingCodeBinding && existingCodeBinding.email !== cleanEmail) {
    return {
      allowed: false,
      message: `Este código de ${role} ya se encuentra vinculado a la cuenta institucional ${existingCodeBinding.email}. Para proteger la privacidad, no es posible acceder desde otro correo.`
    };
  }

  // If this email is already bound to a different code
  const existingEmailBinding = bindings.find(b => b.email === cleanEmail && b.role === role);
  if (existingEmailBinding && existingEmailBinding.code !== cleanCode) {
    return {
      allowed: false,
      message: `Su cuenta institucional ya está vinculada al código ${existingEmailBinding.code}. No puede ingresar con otro código.`
    };
  }

  return { allowed: true };
}

export function saveCodeBinding(
  email: string, 
  code: string, 
  role: 'docente' | 'tutor' | 'estudiante'
) {
  // Do not bind teachers/tutors consulting student view
  if (role === 'estudiante' && (getEmailDomainType(email) === 'docente' || getEmailDomainType(email) === 'admin')) {
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.toUpperCase().trim();
  const bindings = getStoredBindings().filter(b => !(b.email === cleanEmail && b.role === role));
  bindings.push({
    email: cleanEmail,
    code: cleanCode,
    role,
    timestamp: Date.now()
  });
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch (e) {
    console.warn('Could not persist binding to localStorage', e);
  }
}
