import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  FileText, 
  Share2, 
  Upload, 
  Plus, 
  LogOut, 
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Save,
  Trash2,
  Users
} from 'lucide-react';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDQCHmEHSjRGl4R9mgtWdcHAjF_dnLKC6Q",
  authDomain: "ajaia-9a7ae.firebaseapp.com",
  projectId: "ajaia-9a7ae",
  storageBucket: "ajaia-9a7ae.firebasestorage.app",
  messagingSenderId: "528972168666",
  appId: "1:528972168666:web:02c83ae12fb766b52e94e3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ajaia-docs-default';

export default function AjaiaDocs() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isSettingProfile, setIsSettingProfile] = useState(false);
  const [profileEmailInput, setProfileEmailInput] = useState('');

  const [allDocs, setAllDocs] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [pendingSaveContent, setPendingSaveContent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmailInput, setShareEmailInput] = useState('');
  
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
        setIsSettingProfile(false);
      } else {
        setProfile(null);
        setIsSettingProfile(true);
      }
      setLoading(false);
    }, (error) => {
      console.error("Profile fetch error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !profile) return;

    const docsRef = collection(db, 'artifacts', appId, 'public', 'data', 'documents');
    const unsubscribe = onSnapshot(docsRef, (snapshot) => {
      const docsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllDocs(docsData);
    }, (error) => {
      console.error("Documents fetch error:", error);
    });

    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (pendingSaveContent !== null && currentDocId && user) {
        setIsSaving(true);
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'documents', currentDocId);
        updateDoc(docRef, {
          content: pendingSaveContent,
          updatedAt: Date.now()
        }).then(() => {
          setIsSaving(false);
          setPendingSaveContent(null);
        }).catch(err => {
          console.error("Error saving document:", err);
          setIsSaving(false);
        });
      }
    }, 1500); 

    return () => clearTimeout(saveTimer);
  }, [pendingSaveContent, currentDocId, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileEmailInput.trim() || !user) return;
    
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
    await setDoc(profileRef, {
      email: profileEmailInput.trim().toLowerCase(),
      createdAt: Date.now()
    });
  };

  const handleCreateDocument = async () => {
    if (!user || !profile) return;
    
    const newDoc = {
      title: 'Untitled Document',
      content: '<h1>Untitled Document</h1><p>Start typing here...</p>',
      ownerId: user.uid,
      ownerEmail: profile.email,
      sharedWith: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'documents'), newDoc);
      setCurrentDocId(docRef.id);
    } catch (err) {
      console.error("Error creating document:", err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !user || !profile) return;

    e.target.value = null;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      
      const htmlContent = text
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => `<p>${line}</p>`)
        .join('');

      const newDoc = {
        title: file.name.replace(/\.[^/.]+$/, ""), 
        content: `<h1>${file.name}</h1>${htmlContent}`,
        ownerId: user.uid,
        ownerEmail: profile.email,
        sharedWith: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      try {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'documents'), newDoc);
        setCurrentDocId(docRef.id);
      } catch (err) {
        console.error("Error creating document from file:", err);
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteDocument = async (id, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'documents', id));
      if (currentDocId === id) {
        setCurrentDocId(null);
      }
    } catch (err) {
      console.error("Error deleting document:", err);
    }
  };

  const handleShareDocument = async (e) => {
    e.preventDefault();
    if (!currentDocId || !shareEmailInput.trim() || !user) return;

    const emailToShare = shareEmailInput.trim().toLowerCase();
    const targetDoc = allDocs.find(d => d.id === currentDocId);
    
    if (targetDoc && targetDoc.ownerId === user.uid) {
      const updatedSharedWith = [...new Set([...(targetDoc.sharedWith || []), emailToShare])];
      
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'documents', currentDocId);
        await updateDoc(docRef, {
          sharedWith: updatedSharedWith
        });
        setShareEmailInput('');
        setIsShareModalOpen(false);
      } catch (err) {
        console.error("Error sharing document:", err);
      }
    }
  };

  const removeShare = async (emailToRemove) => {
     if (!currentDocId || !user) return;
     const targetDoc = allDocs.find(d => d.id === currentDocId);
     
     if (targetDoc && targetDoc.ownerId === user.uid) {
        const updatedSharedWith = targetDoc.sharedWith.filter(e => e !== emailToRemove);
        try {
          const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'documents', currentDocId);
          await updateDoc(docRef, { sharedWith: updatedSharedWith });
        } catch (err) {
          console.error("Error removing share:", err);
        }
     }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleEditorInput({ target: editorRef.current });
    }
  };

  const handleEditorInput = (e) => {
    setPendingSaveContent(e.target.innerHTML);
  };

  const handleTitleChange = (e) => {
    if (!currentDocId || !user) return;
    const newTitle = e.target.value;
    
    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'documents', currentDocId), {
      title: newTitle || 'Untitled Document',
      updatedAt: Date.now()
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading AjaiaDocs...</div>;
  }

  if (isSettingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
              <FileText size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Welcome to AjaiaDocs</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">Please set your email address to collaborate with others.</p>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={profileEmailInput}
                onChange={(e) => setProfileEmailInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const myDocs = allDocs.filter(d => d.ownerId === user?.uid).sort((a, b) => b.updatedAt - a.updatedAt);
  const sharedDocs = allDocs.filter(d => d.sharedWith?.includes(profile?.email)).sort((a, b) => b.updatedAt - a.updatedAt);
  const currentDocument = currentDocId ? allDocs.find(d => d.id === currentDocId) : null;

  if (!currentDocId) {
    return (
      <div className="min-h-screen bg-gray-50">
      
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-blue-600">
            <FileText size={28} className="fill-current text-blue-600" />
            <span className="text-xl font-bold text-gray-800 tracking-tight">AjaiaDocs</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {profile?.email}
            </span>
            <button 
              onClick={() => {
                setProfile(null);
                setIsSettingProfile(true);
              }}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="Change Account"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
        
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <button
              onClick={handleCreateDocument}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-sm hover:bg-blue-700 hover:shadow-md transition-all font-medium"
            >
              <Plus size={20} />
              New Document
            </button>
            
            <div className="relative flex-1 sm:flex-none">
              <input
                type="file"
                accept=".txt,.md"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
              >
                <Upload size={20} />
                Upload .txt / .md
              </button>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              My Documents
              <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{myDocs.length}</span>
            </h2>
            
            {myDocs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed p-10 text-center text-gray-500">
                <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                <p>You haven't created any documents yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {myDocs.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => setCurrentDocId(doc.id)}
                    className="group bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all flex flex-col h-48"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate mb-1" title={doc.title}>{doc.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">
                        Updated {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                      
                      <div className="text-sm text-gray-400 line-clamp-3 leading-relaxed break-words"
                           dangerouslySetInnerHTML={{ __html: doc.content.replace(/<[^>]*>?/gm, ' ') }} 
                      />
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users size={14} />
                        {doc.sharedWith?.length || 0} shared
                      </div>
                      <button 
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Document"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Shared with Me
              <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{sharedDocs.length}</span>
            </h2>
            
            {sharedDocs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 border-dashed p-10 text-center text-gray-500">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p>No documents have been shared with you yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sharedDocs.map(doc => (
                  <div 
                    key={doc.id}
                    onClick={() => setCurrentDocId(doc.id)}
                    className="group bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-green-400 hover:shadow-md transition-all flex flex-col h-48"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate" title={doc.title}>{doc.title}</h3>
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Shared</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 truncate">
                        Owner: {doc.ownerEmail}
                      </p>
                      <div className="text-sm text-gray-400 line-clamp-3 leading-relaxed break-words"
                           dangerouslySetInnerHTML={{ __html: doc.content.replace(/<[^>]*>?/gm, ' ') }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!currentDocument) {
    return <div className="min-h-screen flex items-center justify-center">Document not found.</div>;
  }

  const isOwner = currentDocument.ownerId === user?.uid;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
   
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => {
              setCurrentDocId(null);
              setPendingSaveContent(null);
            }}
            className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex items-center gap-3">
             <FileText size={24} className="fill-current text-blue-600" />
             <div className="flex flex-col">
               <input
                 type="text"
                 value={currentDocument.title}
                 onChange={handleTitleChange}
                 className="text-lg font-medium text-gray-800 bg-transparent border-none outline-none hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-1 -ml-1 transition-all"
                 disabled={!isOwner}
                 placeholder="Untitled Document"
               />
               <div className="flex items-center gap-2 text-xs text-gray-500 px-1 mt-0.5">
                  {isSaving ? (
                    <span className="flex items-center gap-1 text-gray-400"><Save size={12} className="animate-pulse" /> Saving...</span>
                  ) : pendingSaveContent !== null ? (
                    <span className="text-amber-500">Unsaved changes</span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600"><Save size={12} /> Saved to cloud</span>
                  )}
               </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors font-medium text-sm"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
          {!isOwner && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2">
              <Users size={14} /> Shared by {currentDocument.ownerEmail}
            </span>
          )}
        </div>
      </header>

      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-1 sticky top-[60px] z-10 overflow-x-auto">
        <ToolbarButton icon={<Bold size={18} />} onClick={() => execCommand('bold')} tooltip="Bold" />
        <ToolbarButton icon={<Italic size={18} />} onClick={() => execCommand('italic')} tooltip="Italic" />
        <ToolbarButton icon={<Underline size={18} />} onClick={() => execCommand('underline')} tooltip="Underline" />
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <ToolbarButton icon={<Heading1 size={18} />} onClick={() => execCommand('formatBlock', 'H1')} tooltip="Heading 1" />
        <ToolbarButton icon={<Heading2 size={18} />} onClick={() => execCommand('formatBlock', 'H2')} tooltip="Heading 2" />
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        <ToolbarButton icon={<List size={18} />} onClick={() => execCommand('insertUnorderedList')} tooltip="Bullet List" />
        <ToolbarButton icon={<ListOrdered size={18} />} onClick={() => execCommand('insertOrderedList')} tooltip="Numbered List" />
      </div>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 flex justify-center">
        <div 
          className="bg-white w-full max-w-4xl min-h-[800px] shadow-sm border border-gray-200 p-10 sm:p-16 outline-none text-gray-800 document-editor"
          contentEditable={true}
          ref={editorRef}
          onInput={handleEditorInput}
          suppressContentEditableWarning={true}
          dangerouslySetInnerHTML={{ __html: currentDocument.content }}
          style={{
             '--tw-prose-body': '#374151',
             '--tw-prose-headings': '#111827',
             '--tw-prose-links': '#2563eb',
          }}
        />
        
        <style dangerouslySetInnerHTML={{__html: `
          .document-editor p { margin-bottom: 1em; line-height: 1.6; }
          .document-editor h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5em; margin-top: 1em; line-height: 1.2; }
          .document-editor h1:first-child { margin-top: 0; }
          .document-editor h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5em; margin-top: 1em; }
          .document-editor ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1em; }
          .document-editor ol { list-style-type: decimal; padding-left: 2em; margin-bottom: 1em; }
          .document-editor b, .document-editor strong { font-weight: 700; }
          .document-editor i, .document-editor em { font-style: italic; }
          .document-editor u { text-decoration: underline; }
          .document-editor:empty:before { content: "Start typing..."; color: #9ca3af; pointer-events: none; display: block; }
        `}} />
      </main>

      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Share2 size={20} className="text-blue-500" /> Share Document
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleShareDocument} className="flex gap-2 mb-6">
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={shareEmailInput}
                  onChange={(e) => setShareEmailInput(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  Share
                </button>
              </form>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">People with access</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {currentDocument.ownerEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{currentDocument.ownerEmail}</p>
                        <p className="text-xs text-gray-500">Owner</p>
                      </div>
                    </div>
                  </div>
                  
                  {currentDocument.sharedWith?.map((email, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm">
                          {email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{email}</p>
                          <p className="text-xs text-gray-500">Editor</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeShare(email)}
                        className="text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  {(!currentDocument.sharedWith || currentDocument.sharedWith.length === 0) && (
                    <p className="text-sm text-gray-500 italic">Not shared with anyone yet.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ icon, onClick, tooltip }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="p-1.5 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded transition-colors flex items-center justify-center"
    >
      {icon}
    </button>
  );
}