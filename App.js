import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';

// ==========================================
// CONFIGURATION
// ==========================================
const API_URL = process.env.REACT_APP_API_URL || 'https://webscool-api.onrender.com/api';
const APP_CONFIG = {
  nom: 'WebScool',
  etablissement: 'COLLÈGE MODERNE BOUAKÉ DAR ES SALAM',
  anneeScolaire: '2025-2026',
  motDePasse: 'dares2026',
  montantInscription: 1000
};

const DOCUMENTS_EDUCATEURS = [
  { key: 'extrait', label: 'Extrait', icon: '📄' },
  { key: 'chemise_rabat', label: 'Chemise', icon: '📁' },
  { key: 'enveloppe_timbree', label: 'Enveloppe', icon: '✉️' },
  { key: 'bulletin', label: 'Bulletin', icon: '📊' },
  { key: 'photos_identite', label: 'Photos', icon: '📷' },
  { key: 'fiche_renseignement', label: 'Fiche renseign.', icon: '📝' },
  { key: 'fiche_inscription_ligne', label: 'Fiche ligne', icon: '💻' },
  { key: 'carnet_correspondance', label: 'Carnet', icon: '📔' },
  { key: 'livret_scolaire', label: 'Livret', icon: '📖' },
  { key: 'diplome', label: 'Diplôme', icon: '🎓' }
];

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function App() {
  // États globaux
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Navigation
  const [currentView, setCurrentView] = useState('dashboard');
  
  // Données
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  
  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterSexe, setFilterSexe] = useState('');
  
  // Sélection
  const [selectedEleve, setSelectedEleve] = useState(null);
  
  // Notification
  const [notification, setNotification] = useState(null);

  // Chargement initial simulé
  useEffect(() => {
    const init = async () => {
      for (let i = 0; i <= 100; i += 20) {
        setLoadingProgress(i);
        await new Promise(r => setTimeout(r, 200));
      }
      setIsLoading(false);
    };
    init();
  }, []);

  // Chargement des données
  const loadData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [elevesRes, classesRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/eleves`),
        axios.get(`${API_URL}/eleves/classes`),
        axios.get(`${API_URL}/eleves/stats/global`)
      ]);
      setEleves(elevesRes.data);
      setClasses(classesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      showNotification('Erreur de chargement des données', 'error');
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === APP_CONFIG.motDePasse) {
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Mot de passe incorrect');
    }
  };

  const navigateTo = (view, eleve = null) => {
    setCurrentView(view);
    if (eleve) setSelectedEleve(eleve);
  };

  // Filtrage
  const filteredEleves = useMemo(() => {
    return eleves.filter(e => {
      if (filterClasse && e.classe !== filterClasse) return false;
      if (filterSexe && e.sexe !== filterSexe) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (e.nom?.toLowerCase().includes(q) || 
                e.prenom?.toLowerCase().includes(q) || 
                e.matricule?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [eleves, filterClasse, filterSexe, searchQuery]);

  // Écrans initiaux
  if (isLoading) return <LoadingScreen progress={loadingProgress} />;
  if (!isAuthenticated) return <LoginScreen password={password} setPassword={setPassword} error={passwordError} onSubmit={handleLogin} />;

  // Rendu principal
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header stats={stats} onLogout={() => setIsAuthenticated(false)} />
      <Navigation current={currentView} onNavigate={navigateTo} stats={stats} />
      
      <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
        {isDataLoading && <LoadingOverlay />}
        
        {currentView === 'dashboard' && <Dashboard stats={stats} classes={classes} onNavigate={navigateTo} />}
        {currentView === 'eleves' && (
          <ElevesList
            eleves={filteredEleves}
            classes={classes.map(c => c.classe)}
            filters={{ searchQuery, setSearchQuery, filterClasse, setFilterClasse, filterSexe, setFilterSexe }}
            onView={(e) => navigateTo('eleve-detail', e)}
            onEdit={(e) => navigateTo('eleve-edit', e)}
            onAdd={() => navigateTo('eleve-add')}
            onRefresh={loadData}
          />
        )}
        {(currentView === 'eleve-add' || currentView === 'eleve-edit') && (
          <EleveForm
            eleve={currentView === 'eleve-edit' ? selectedEleve : null}
            classes={classes.map(c => c.classe)}
            onSave={(msg) => { showNotification(msg); loadData(); navigateTo('eleves'); }}
            onCancel={() => navigateTo('eleves')}
          />
        )}
        {currentView === 'eleve-detail' && selectedEleve && (
          <EleveDetail eleve={selectedEleve} onBack={() => navigateTo('eleves')} onEdit={() => navigateTo('eleve-edit', selectedEleve)} />
        )}
        {currentView === 'import' && <ImportExcel onSuccess={(msg) => { showNotification(msg); loadData(); }} />}
        {currentView === 'paiements' && <Paiements eleves={eleves} onRefresh={loadData} />}
        {currentView === 'educateurs' && <Educateurs eleves={eleves} />}
        {currentView === 'photos' && <Photos eleves={eleves} onRefresh={loadData} />}
      </main>
    </div>
  );
}

// ==========================================
// COMPOSANTS UI
// ==========================================

function LoadingScreen({ progress }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.95)', padding: '3rem', borderRadius: '24px',
        textAlign: 'center', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏫</div>
        <h1 style={{ color: '#1e3a5f', fontSize: '2rem', fontWeight: '800' }}>WebScool</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>{APP_CONFIG.etablissement}</p>
        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #0ea5e9)', borderRadius: '999px', transition: 'width 0.3s' }} />
        </div>
        <p style={{ color: '#3b82f6', fontWeight: '700', fontSize: '1.25rem', marginTop: '1rem' }}>{progress}%</p>
      </div>
    </div>
  );
}

function LoginScreen({ password, setPassword, error, onSubmit }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', padding: '2rem'
    }}>
      <form onSubmit={onSubmit} style={{ background: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem' }}>🔐</div>
          <h1 style={{ color: '#1e3a5f', fontSize: '1.75rem', fontWeight: '700' }}>Connexion</h1>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          style={{ width: '100%', padding: '0.875rem 1rem', border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`, borderRadius: '12px', fontSize: '1rem', marginBottom: error ? '0.5rem' : '1.5rem' }}
          autoFocus
        />
        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
        <button type="submit" style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
          Se connecter
        </button>
      </form>
    </div>
  );
}

function Header({ stats, onLogout }) {
  return (
    <header style={{
      background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', color: 'white',
      padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '2rem' }}>🏫</span>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>WebScool</h1>
          <p style={{ fontSize: '0.75rem', opacity: 0.9, margin: 0 }}>{stats?.eleves?.total_eleves || 0} élèves • {APP_CONFIG.anneeScolaire}</p>
        </div>
      </div>
      <button onClick={onLogout} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
        Déconnexion
      </button>
    </header>
  );
}

function Navigation({ current, onNavigate, stats }) {
  const items = [
    { id: 'dashboard', label: '📊 Tableau de bord' },
    { id: 'eleves', label: `👥 Élèves (${stats?.eleves?.total_eleves || 0})` },
    { id: 'import', label: '📥 Import Excel' },
    { id: 'paiements', label: '💰 Paiements' },
    { id: 'educateurs', label: '📋 Éducateurs' },
    { id: 'photos', label: '📷 Photos' },
  ];

  return (
    <nav style={{ background: 'white', padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          style={{
            padding: '0.625rem 1.25rem', borderRadius: '10px', border: 'none', fontSize: '0.875rem', fontWeight: current === item.id ? '600' : '500', cursor: 'pointer', whiteSpace: 'nowrap',
            background: current === item.id ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
            color: current === item.id ? 'white' : '#64748b'
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function Notification({ message, type, onClose }) {
  const colors = { success: '#dcfce7', error: '#fee2e2', info: '#dbeafe' };
  const textColors = { success: '#166534', error: '#991b1b', info: '#1e40af' };
  
  return (
    <div style={{
      position: 'fixed', top: '80px', right: '1.5rem', padding: '1rem 1.5rem',
      background: colors[type], borderRadius: '12px', color: textColors[type],
      fontWeight: '600', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'fadeIn 0.3s ease-out'
    }}>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', opacity: 0.6 }}>×</button>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `2px solid ${color}20` }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.875rem', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>{label}</div>
    </div>
  );
}

// ==========================================
// VUES
// ==========================================

function Dashboard({ stats, classes, onNavigate }) {
  const s = stats?.eleves || {};
  
  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>📊 Tableau de bord</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon="👥" value={s.total_eleves || 0} label="Total élèves" color="#3b82f6" />
        <StatCard icon="👦" value={s.garcons || 0} label="Garçons" color="#60a5fa" />
        <StatCard icon="👧" value={s.filles || 0} label="Filles" color="#ec4899" />
        <StatCard icon="✅" value={s.admis || 0} label="Admis" color="#22c55e" />
        <StatCard icon="🔄" value={s.redoublants || 0} label="Redoublants" color="#f59e0b" />
        <StatCard icon="💰" value={`${stats?.finances?.montant_total || 0} F`} label="Encaissé" color="#8b5cf6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>🏫 Répartition par classe</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {classes.slice(0, 6).map(c => (
              <div key={c.classe} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>{c.classe}</span>
                <span style={{ color: '#64748b' }}>{c.nb_eleves} élèves</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>⚡ Actions rapides</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={() => onNavigate('eleves')} style={{ padding: '0.75rem', background: '#eff6ff', color: '#1e40af', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', textAlign: 'left' }}>
              👥 Voir tous les élèves
            </button>
            <button onClick={() => onNavigate('import')} style={{ padding: '0.75rem', background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', textAlign: 'left' }}>
              📥 Importer des élèves
            </button>
            <button onClick={() => onNavigate('paiements')} style={{ padding: '0.75rem', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', textAlign: 'left' }}>
              💰 Gérer les paiements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ElevesList({ eleves, classes, filters, onView, onEdit, onAdd, onRefresh }) {
  const { searchQuery, setSearchQuery, filterClasse, setFilterClasse, filterSexe, setFilterSexe } = filters;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f' }}>👥 Liste des élèves</h2>
        <button onClick={onAdd} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
          ➕ Ajouter un élève
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          placeholder="🔍 Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.625rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', flex: 1, minWidth: '200px' }}
        />
        <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} style={{ padding: '0.625rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' }}>
          <option value="">Toutes les classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} style={{ padding: '0.625rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' }}>
          <option value="">Tous sexes</option>
          <option value="M">Garçons</option>
          <option value="F">Filles</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photo</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matricule</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nom</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prénom</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classe</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sexe</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MGA</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Décision</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {eleves.map((e, idx) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {e.photo_url ? (
                      <img src={e.photo_url} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '6px' }} />
                    ) : (
                      <div style={{ width: '40px', height: '50px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#64748b' }}>{e.matricule}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '700', color: '#1e3a5f' }}>{e.nom}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{e.prenom}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600' }}>
                      {e.classe}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '1.25rem' }}>{e.sexe === 'M' ? '👦' : '👧'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600' }}>{e.moyenne_generale || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {e.decision_fin_annee && (
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                        background: e.decision_fin_annee === 'Admis' ? '#dcfce7' : e.decision_fin_annee === 'Redoublant' ? '#fef3c7' : '#fee2e2',
                        color: e.decision_fin_annee === 'Admis' ? '#166534' : e.decision_fin_annee === 'Redoublant' ? '#92400e' : '#991b1b'
                      }}>
                        {e.decision_fin_annee}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button onClick={() => onView(e)} style={{ padding: '0.5rem', background: '#eff6ff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '0.5rem' }}>👁️</button>
                    <button onClick={() => onEdit(e)} style={{ padding: '0.5rem', background: '#fef3c7', border: 'none', borderRadius: '6px', cursor: 'pointer', marginRight: '0.5rem' }}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {eleves.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p>Aucun élève trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EleveForm({ eleve, classes, onSave, onCancel }) {
  const [form, setForm] = useState({
    matricule: eleve?.matricule || '',
    nom: eleve?.nom || '',
    prenom: eleve?.prenom || '',
    classe: eleve?.classe || '',
    sexe: eleve?.sexe || 'M',
    statut: eleve?.statut || 'Non affecté',
    qualite: eleve?.qualite || '',
    date_naissance: eleve?.date_naissance ? eleve.date_naissance.split('T')[0] : '',
    lieu_naissance: eleve?.lieu_naissance || '',
    nom_parent: eleve?.nom_parent || '',
    telephone1: eleve?.telephone1 || '',
    telephone2: eleve?.telephone2 || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) {
      setError('Nom et prénom obligatoires');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        ...form,
        matricule: form.matricule.toUpperCase(),
        nom: form.nom.toUpperCase()
      };
      
      if (eleve) {
        await axios.put(`${API_URL}/eleves/${eleve.id}`, data);
        onSave('✅ Élève modifié avec succès');
      } else {
        await axios.post(`${API_URL}/eleves`, data);
        onSave('✅ Élève ajouté avec succès');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.625rem 1rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>
        {eleve ? '✏️ Modifier un élève' : '➕ Ajouter un élève'}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '10px', marginBottom: '1.5rem' }}>{error}</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Matricule</label>
            <input value={form.matricule} onChange={(e) => setForm({...form, matricule: e.target.value})} style={inputStyle} placeholder="2024-0001" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Nom *</label>
            <input value={form.nom} onChange={(e) => setForm({...form, nom: e.target.value})} style={inputStyle} placeholder="NOM EN MAJUSCULES" required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Prénom *</label>
            <input value={form.prenom} onChange={(e) => setForm({...form, prenom: e.target.value})} style={inputStyle} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Classe</label>
            <input value={form.classe} onChange={(e) => setForm({...form, classe: e.target.value})} style={inputStyle} list="classes-list" placeholder="6eA, 5eB..." />
            <datalist id="classes-list">
              {classes.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Sexe</label>
            <select value={form.sexe} onChange={(e) => setForm({...form, sexe: e.target.value})} style={inputStyle}>
              <option value="M">👦 Masculin</option>
              <option value="F">👧 Féminin</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Date de naissance</label>
            <input type="date" value={form.date_naissance} onChange={(e) => setForm({...form, date_naissance: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Lieu de naissance</label>
            <input value={form.lieu_naissance} onChange={(e) => setForm({...form, lieu_naissance: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Statut</label>
            <select value={form.statut} onChange={(e) => setForm({...form, statut: e.target.value})} style={inputStyle}>
              <option>Non affecté</option>
              <option>Affecté</option>
              <option>Transféré</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Qualité</label>
            <select value={form.qualite} onChange={(e) => setForm({...form, qualite: e.target.value})} style={inputStyle}>
              <option value="">--</option>
              <option>Nouveau</option>
              <option>Ancien</option>
              <option>Redoublant</option>
              <option>Transféré entrant</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Nom du parent</label>
            <input value={form.nom_parent} onChange={(e) => setForm({...form, nom_parent: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Téléphone 1</label>
            <input value={form.telephone1} onChange={(e) => setForm({...form, telephone1: e.target.value})} style={inputStyle} placeholder="0759109875" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>Téléphone 2</label>
            <input value={form.telephone2} onChange={(e) => setForm({...form, telephone2: e.target.value})} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
          </button>
          <button type="button" onClick={onCancel} style={{ padding: '0.75rem 2rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

function EleveDetail({ eleve, onBack, onEdit }) {
  return (
    <div className="animate-fade-in">
      <button onClick={onBack} style={{ marginBottom: '1rem', padding: '0.5rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>← Retour</button>
      
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <div>
            {eleve.photo_url ? (
              <img src={eleve.photo_url} alt="" style={{ width: '150px', height: '190px', objectFit: 'cover', borderRadius: '12px' }} />
            ) : (
              <div style={{ width: '150px', height: '190px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>👤</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.5rem' }}>
              {eleve.nom} {eleve.prenom}
            </h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Matricule: <strong>{eleve.matricule}</strong> • 
              Classe: <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '999px', fontWeight: '600' }}>{eleve.classe}</span>
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: '#1e3a5f', fontWeight: '600', marginBottom: '0.5rem' }}>📅 Naissance</h4>
                <p>Date: {eleve.date_naissance ? new Date(eleve.date_naissance).toLocaleDateString('fr-FR') : '-'}</p>
                <p>Lieu: {eleve.lieu_naissance || '-'}</p>
              </div>
              <div>
                <h4 style={{ color: '#1e3a5f', fontWeight: '600', marginBottom: '0.5rem' }}>👨‍👩‍👧 Contact</h4>
                <p>Parent: {eleve.nom_parent || '-'}</p>
                <p>Tél: {eleve.telephone1 || '-'}</p>
              </div>
              <div>
                <h4 style={{ color: '#1e3a5f', fontWeight: '600', marginBottom: '0.5rem' }}>📊 Scolarité</h4>
                <p>T1: {eleve.moyenne_t1 || '-'} • T2: {eleve.moyenne_t2 || '-'} • T3: {eleve.moyenne_t3 || '-'}</p>
                <p>MGA: <strong style={{ fontSize: '1.25rem', color: '#2563eb' }}>{eleve.moyenne_generale || '-'}</strong></p>
                {eleve.decision_fin_annee && (
                  <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: '600',
                    background: eleve.decision_fin_annee === 'Admis' ? '#dcfce7' : eleve.decision_fin_annee === 'Redoublant' ? '#fef3c7' : '#fee2e2',
                    color: eleve.decision_fin_annee === 'Admis' ? '#166534' : eleve.decision_fin_annee === 'Redoublant' ? '#92400e' : '#991b1b'
                  }}>
                    {eleve.decision_fin_annee}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <button onClick={onEdit} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
          ✏️ Modifier
        </button>
      </div>
    </div>
  );
}

// ==========================================
// IMPORT EXCEL - SOLUTION CLÉ (SheetJS)
// ==========================================

function ImportExcel({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  // Générer modèle Excel
  const downloadTemplate = () => {
    if (!window.XLSX) {
      alert('SheetJS non chargé. Rechargez la page.');
      return;
    }

    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet([
      ['Matricule', 'Nom', 'Prenom', 'DateNaiss', 'LieuNaiss', 'Sexe', 'Statut', 'Qualite', 'Classe', 'nom_parent', 'telephone1', 'telephone2'],
      ['2024-0001', 'KONE', 'Aminata', '15/03/2010', 'Bouake', 'F', 'Interne', 'Nouveau', '6eA', 'KONE Paul', '0759109875', ''],
      ['2024-0002', 'TRAORE', 'Ibrahim', '22/07/2009', 'Abidjan', 'M', 'Externe', 'Ancien', '5eB', 'TRAORE Mariam', '0700123456', ''],
    ]);
    
    ws['!cols'] = [
      {wch: 12}, {wch: 18}, {wch: 20}, {wch: 12}, {wch: 15}, 
      {wch: 8}, {wch: 12}, {wch: 12}, {wch: 8}, {wch: 20}, {wch: 13}, {wch: 13}
    ];
    
    window.XLSX.utils.book_append_sheet(wb, ws, 'Eleves');
    window.XLSX.writeFile(wb, 'modele_import_eleves.xlsx');
  };

  // Lire fichier Excel
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = window.XLSX.utils.sheet_to_json(sheet, { raw: false });
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Normaliser date
  const normalizeDate = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const n = parseFloat(s);
    if (!isNaN(n) && n > 1000) {
      const d = new Date((n - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return null;
  };

  // Sélection fichier
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setStatus('⏳ Lecture du fichier...');
    
    try {
      const data = await readExcelFile(selectedFile);
      if (data.length === 0) {
        setStatus('❌ Fichier vide');
        return;
      }
      
      setPreview({
        columns: Object.keys(data[0]),
        rows: data.slice(0, 5).map(r => Object.values(r)),
        total: data.length
      });
      
      setStatus(`✅ ${data.length} lignes détectées. Cliquez sur "Lancer l'import"`);
    } catch (err) {
      setStatus('❌ Erreur lecture: ' + err.message);
    }
  };

  // Import principal
  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    setStatus('⏳ Lecture Excel...');
    
    try {
      const rawData = await readExcelFile(file);
      
      // Normaliser données
      const normalizedData = rawData.map(row => {
        const matricule = String(row.Matricule || row.matricule || '').trim();
        const nom = String(row.Nom || row.nom || '').trim().toUpperCase();
        if (!matricule || !nom) return null;
        
        let sexe = String(row.Sexe || row.sexe || 'M').toUpperCase();
        sexe = ['M', 'MASCULIN'].includes(sexe) ? 'M' : 'F';
        
        return {
          matricule,
          nom,
          prenom: String(row.Prenom || row.prenom || '').trim() || null,
          date_naissance: normalizeDate(row.DateNaiss || row.date_naissance),
          lieu_naissance: String(row.LieuNaiss || row.lieu_naissance || '').trim() || null,
          sexe,
          statut: String(row.Statut || row.statut || '').trim() || null,
          qualite: String(row.Qualite || row.qualite || '').trim() || null,
          classe: String(row.Classe || row.classe || '').trim().toUpperCase() || null,
          nom_parent: String(row.nom_parent || row.Parent || '').trim() || null,
          telephone1: String(row.telephone1 || row.Telephone1 || '').replace(/[^0-9]/g, '') || null,
          telephone2: String(row.telephone2 || row.Telephone2 || '').replace(/[^0-9]/g, '') || null,
        };
      }).filter(Boolean);
      
      if (normalizedData.length === 0) {
        setStatus('❌ Aucun élève valide trouvé');
        setImporting(false);
        return;
      }
      
      // Envoi par lots de 200 (évite timeout)
      const BATCH_SIZE = 200;
      let totalImported = 0;
      let errors = [];
      
      for (let i = 0; i < normalizedData.length; i += BATCH_SIZE) {
        const batch = normalizedData.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(normalizedData.length / BATCH_SIZE);
        
        setProgress(Math.round((i / normalizedData.length) * 100));
        setStatus(`⏳ Envoi lot ${batchNum}/${totalBatches} (${batch.length} élèves)...`);
        
        try {
          const res = await axios.post(`${API_URL}/import/eleves-json`, { eleves: batch }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
          });
          totalImported += res.data.imported || 0;
        } catch (err) {
          errors.push(`Lot ${batchNum}: ${err.response?.data?.error || err.message}`);
        }
      }
      
      setProgress(100);
      setStatus(
        `✅ ${totalImported}/${normalizedData.length} élèves importés` + 
        (errors.length > 0 ? ` (${errors.length} erreurs)` : '')
      );
      
      onSuccess(`Import terminé: ${totalImported} élèves`);
      setFile(null);
      setPreview(null);
      
    } catch (err) {
      setStatus('❌ Erreur: ' + err.message);
    }
    
    setImporting(false);
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>📥 Import Excel des élèves</h2>
      
      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ color: '#1e3a5f', marginBottom: '0.5rem' }}>Import via SheetJS (100% frontend)</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Colonnes: Matricule, Nom, Prenom, DateNaiss, LieuNaiss, Sexe, Statut, Qualite, Classe, nom_parent, telephone1, telephone2
            </p>
          </div>
          <button onClick={downloadTemplate} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#374151', border: '2px solid #e2e8f0', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
            📥 Télécharger modèle
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onClick={() => document.getElementById('file-input').click()}
          style={{
            border: `3px dashed ${file ? '#3b82f6' : '#cbd5e1'}`,
            borderRadius: '16px',
            padding: '3rem',
            textAlign: 'center',
            background: file ? '#eff6ff' : '#f8fafc',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</div>
          <p style={{ fontWeight: '600', color: '#1e3a5f', marginBottom: '0.25rem' }}>
            {file ? file.name : 'Cliquez ou déposez votre fichier Excel'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>.xlsx, .xls acceptés</p>
          <input id="file-input" type="file" accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>

        {/* Aperçu */}
        {preview && (
          <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px' }}>
            <p style={{ fontWeight: '600', color: '#1e3a5f', marginBottom: '0.75rem' }}>👁️ Aperçu ({preview.total} lignes totales)</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {preview.columns.map((c, i) => <th key={i} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: '600' }}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j} style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #0ea5e9)', borderRadius: '999px', transition: 'width 0.3s' }} />
            </div>
            <p style={{ textAlign: 'center', color: '#3b82f6', fontWeight: '600', marginTop: '0.5rem' }}>{progress}%</p>
          </div>
        )}

        {status && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '10px',
            background: status.includes('✅') ? '#dcfce7' : status.includes('❌') ? '#fee2e2' : '#dbeafe',
            color: status.includes('✅') ? '#166534' : status.includes('❌') ? '#991b1b' : '#1e40af',
            fontWeight: '600'
          }}>
            {status}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          style={{
            width: '100%',
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: !file || importing ? 'not-allowed' : 'pointer',
            opacity: !file || importing ? 0.6 : 1
          }}
        >
          {importing ? '⏳ Import en cours...' : '🚀 Lancer l\'import'}
        </button>
      </div>
    </div>
  );
}

function Paiements({ eleves, onRefresh }) {
  const [loading, setLoading] = useState({});

  const togglePaiement = async (eleve) => {
    const estPaye = eleve.a_paye;
    setLoading(prev => ({ ...prev, [eleve.id]: true }));
    
    try {
      if (estPaye) {
        await axios.delete(`${API_URL}/inscriptions/${eleve.id}`);
      } else {
        await axios.post(`${API_URL}/inscriptions`, {
          eleve_id: eleve.id,
          montant: APP_CONFIG.montantInscription,
          date_paiement: new Date().toISOString().split('T')[0]
        });
      }
      onRefresh();
    } catch (err) {
      alert('Erreur paiement');
    } finally {
      setLoading(prev => ({ ...prev, [eleve.id]: false }));
    }
  };

  const payes = eleves.filter(e => e.a_paye);
  const nonPayes = eleves.filter(e => !e.a_paye);

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>💰 Gestion des paiements</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>{payes.length}</div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>✅ Payés</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>{nonPayes.length}</div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>❌ Non payés</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#8b5cf6' }}>{(payes.length * APP_CONFIG.montantInscription).toLocaleString()} F</div>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>💰 Total encaissé</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Élève</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Classe</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Parent</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Statut</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {eleves.slice(0, 100).map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <strong>{e.nom}</strong> {e.prenom}
                    <br />
                    <small style={{ color: '#64748b' }}>{e.matricule}</small>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '999px', fontSize: '0.75rem' }}>{e.classe}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>{e.nom_parent || '-'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {e.a_paye ? (
                      <span style={{ padding: '0.25rem 0.75rem', background: '#dcfce7', color: '#166534', borderRadius: '999px', fontSize: '0.75rem' }}>
                        ✅ Payé
                      </span>
                    ) : (
                      <span style={{ padding: '0.25rem 0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '999px', fontSize: '0.75rem' }}>
                        ❌ Non payé
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => togglePaiement(e)}
                      disabled={loading[e.id]}
                      style={{
                        padding: '0.5rem 1rem',
                        background: e.a_paye ? '#fee2e2' : '#dcfce7',
                        color: e.a_paye ? '#991b1b' : '#166534',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {loading[e.id] ? '⏳' : e.a_paye ? '❌ Annuler' : '✅ Encaisser'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Educateurs({ eleves }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/educateurs`);
        const map = {};
        res.data.forEach(item => { map[item.eleve_id] = item; });
        setData(map);
      } catch (err) {
        console.error('Erreur chargement éducateurs:', err);
      }
    };
    fetchData();
  }, []);

  const toggleDoc = async (eleve, docKey) => {
    const current = data[eleve.id] || {};
    const newValue = !current[docKey];
    
    setLoading(prev => ({ ...prev, [eleve.id]: true }));
    
    try {
      const docs = {};
      DOCUMENTS_EDUCATEURS.forEach(d => { docs[d.key] = current[d.key] || false; });
      docs[docKey] = newValue;
      docs.observations = current.observations || '';
      
      await axios.post(`${API_URL}/educateurs`, { eleve_id: eleve.id, ...docs });
      setData(prev => ({ ...prev, [eleve.id]: { ...prev[eleve.id], eleve_id: eleve.id, ...docs } }));
    } catch (err) {
      alert('Erreur sauvegarde');
    }
    
    setLoading(prev => ({ ...prev, [eleve.id]: false }));
  };

  const countDocs = (eleveId) => {
    const item = data[eleveId];
    if (!item) return 0;
    return DOCUMENTS_EDUCATEURS.filter(d => item[d.key]).length;
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>📋 Documents éducateurs</h2>
      
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', color: 'white' }}>
                <th style={{ padding: '0.75rem' }}>Élève</th>
                <th style={{ padding: '0.75rem' }}>Classe</th>
                {DOCUMENTS_EDUCATEURS.map(d => (
                  <th key={d.key} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }} title={d.label}>
                    {d.icon}
                  </th>
                ))}
                <th style={{ padding: '0.75rem' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {eleves.slice(0, 50).map(e => {
                const nb = countDocs(e.id);
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem' }}><strong>{e.nom}</strong> {e.prenom}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', background: '#dbeafe', color: '#1e40af', borderRadius: '999px', fontSize: '0.75rem' }}>{e.classe}</span>
                    </td>
                    {DOCUMENTS_EDUCATEURS.map(d => {
                      const checked = data[e.id]?.[d.key];
                      return (
                        <td key={d.key} style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!checked}
                            onChange={() => toggleDoc(e, d.key)}
                            disabled={loading[e.id]}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: '700',
                        background: nb === 10 ? '#dcfce7' : nb >= 5 ? '#fef3c7' : '#fee2e2',
                        color: nb === 10 ? '#166534' : nb >= 5 ? '#92400e' : '#991b1b'
                      }}>
                        {nb}/10
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Photos({ eleves, onRefresh }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const BATCH = 20;
    const fileArray = Array.from(files);
    let total = 0, errors = 0;
    
    for (let i = 0; i < fileArray.length; i += BATCH) {
      const batch = fileArray.slice(i, i + BATCH);
      const formData = new FormData();
      batch.forEach(f => formData.append('photos', f));
      
      try {
        const res = await axios.post(`${API_URL}/photos/upload-multiple`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        });
        total += res.data.uploaded || 0;
        errors += res.data.erreurs || 0;
      } catch (err) {
        errors += batch.length;
      }
    }
    
    alert(`✅ ${total} photos importées${errors > 0 ? ` (${errors} erreurs)` : ''}`);
    setUploading(false);
    onRefresh();
  };

  const withPhoto = eleves.filter(e => e.photo_url);
  const withoutPhoto = eleves.filter(e => !e.photo_url);

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '1.5rem' }}>📷 Gestion des photos</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>{withPhoto.length}</div>
          <div style={{ color: '#64748b' }}>Avec photo</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>{withoutPhoto.length}</div>
          <div style={{ color: '#64748b' }}>Sans photo</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '3px dashed #cbd5e1', borderRadius: '16px', padding: '3rem',
            textAlign: 'center', background: '#f8fafc', cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
          <p style={{ fontWeight: '600', color: '#1e3a5f' }}>
            {uploading ? '⏳ Upload en cours...' : 'Cliquez pour sélectionner les photos'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Nommez les fichiers avec le matricule: <code>2024-0001.jpg</code>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
        Élèves avec photo ({withPhoto.length})
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        {withPhoto.slice(0, 30).map(e => (
          <div key={e.id} style={{ textAlign: 'center' }}>
            <img
              src={e.photo_url}
              alt=""
              style={{ width: '80px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0' }}
            />
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {e.nom}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}