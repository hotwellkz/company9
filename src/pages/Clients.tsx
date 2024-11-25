import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Users, AlertTriangle } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db, deleteClientContracts, addCategory } from '../lib/firebase';
import { ClientContextMenu } from '../components/ClientContextMenu';
import { Client, NewClient, initialClientState } from '../types/client';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { ClientPage } from './ClientPage';
import { DeleteConfirmationModal } from '../components/modals/DeleteConfirmationModal';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<NewClient>(initialClientState);
  const [showClientPage, setShowClientPage] = useState(false);
  const [status, setStatus] = useState<'building' | 'deposit' | 'built' | 'all'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const generateClientNumber = async (status: 'building' | 'deposit' | 'built', year: number) => {
    try {
      const q = query(
        collection(db, 'clients'),
        where('status', '==', status),
        where('year', '==', year)
      );
      
      const snapshot = await getDocs(q);
      let maxNumber = 0;

      snapshot.forEach(doc => {
        const clientData = doc.data();
        const currentNumber = parseInt(clientData.clientNumber.split('-')[1]);
        if (currentNumber > maxNumber) {
          maxNumber = currentNumber;
        }
      });

      const nextNumber = maxNumber + 1;
      return `${year}-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating client number:', error);
      throw error;
    }
  };

  const fetchClients = async () => {
    try {
      const q = query(collection(db, 'clients'), orderBy('clientNumber'));
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Client[];
      setClients(clientsData);
      return clientsData;
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Ошибка при загрузке списка клиентов');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const yearMatch = client.year === selectedYear;
    const statusMatch = status === 'all' || client.status === status;
    return yearMatch && statusMatch;
  });

  const handleContextMenu = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedClient(client);
    setShowContextMenu(true);
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientPage(true);
  };

  const handleEdit = () => {
    if (selectedClient) {
      setEditingClient({
        ...selectedClient
      });
      setShowEditModal(true);
      setShowContextMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setShowDeleteModal(true);
    setShowContextMenu(false);
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    
    try {
      // Удаляем иконку из категории "Проекты"
      const projectsQuery = query(
        collection(db, 'categories'),
        where('title', '==', `${selectedClient.lastName} ${selectedClient.firstName}`),
        where('row', '==', 3)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      const projectsPromises = projectsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      // Удаляем иконку из категории "Клиенты"
      const clientsQuery = query(
        collection(db, 'categories'),
        where('title', '==', `${selectedClient.lastName} ${selectedClient.firstName}`),
        where('row', '==', 1)
      );
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsPromises = clientsSnapshot.docs.map(doc => deleteDoc(doc.ref));

      // Удаляем все иконки одновременно
      await Promise.all([...projectsPromises, ...clientsPromises]);

      // Удаляем договоры и самого клиента
      await deleteClientContracts(selectedClient.id);
      await deleteDoc(doc(db, 'clients', selectedClient.id));
      
      const updatedClients = await fetchClients();
      setClients(updatedClients);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Ошибка при удалении клиента');
    }
  };

  const handleStatusChange = async (newStatus: 'building' | 'deposit' | 'built') => {
    if (!selectedClient) return;

    try {
      const clientRef = doc(db, 'clients', selectedClient.id);
      
      // Генерируем новый номер для клиента в соответствии с новым статусом
      const newClientNumber = await generateClientNumber(newStatus, selectedClient.year);
      
      await updateDoc(clientRef, { 
        status: newStatus,
        clientNumber: newClientNumber
      });
      
      const updatedClients = await fetchClients();
      setClients(updatedClients);
      setShowContextMenu(false);
    } catch (error) {
      console.error('Error updating client status:', error);
      alert('Ошибка при изменении статуса клиента');
    }
  };

  const handleVisibilityChange = async (client: Client, visible: boolean) => {
    try {
      const clientRef = doc(db, 'clients', client.id);
      
      // Проверяем существующие категории в обеих группах
      const projectsQuery = query(
        collection(db, 'categories'),
        where('title', '==', `${client.lastName} ${client.firstName}`),
        where('row', '==', 3)
      );
      const clientsQuery = query(
        collection(db, 'categories'),
        where('title', '==', `${client.lastName} ${client.firstName}`),
        where('row', '==', 1)
      );

      const [projectsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(clientsQuery)
      ]);
      
      // Удаляем все существующие категории
      const deletePromises = [
        ...projectsSnapshot.docs.map(doc => deleteDoc(doc.ref)),
        ...clientsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      ];
      await Promise.all(deletePromises);

      // Если нужно показать иконки, создаем новые
      if (visible) {
        await Promise.all([
          // Добавляем иконку в категорию "Проекты"
          addCategory({
            title: `${client.lastName} ${client.firstName}`,
            amount: '0 ₸',
            icon: 'Building2',
            color: 'bg-blue-500',
            row: 3
          }),
          // Добавляем иконку в категорию "Клиенты"
          addCategory({
            title: `${client.lastName} ${client.firstName}`,
            amount: '0 ₸',
            icon: 'User',
            color: 'bg-amber-400',
            row: 1
          })
        ]);
      }

      // Обновляем статус видимости у клиента
      await updateDoc(clientRef, { 
        hideProjectIcon: !visible
      });
      
      // Обновляем состояние клиента локально
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id 
            ? { ...c, hideProjectIcon: !visible }
            : c
        )
      );
    } catch (error) {
      console.error('Error updating client visibility:', error);
      alert('Ошибка при изменении видимости клиента');
    }
  };

  const handleClientSaved = async () => {
    if (!showEditModal) {
      // Если это новый клиент, создаем иконки в обеих категориях
      const lastClient = clients[clients.length - 1];
      if (lastClient) {
        try {
          // Добавляем иконку в категорию "Проекты"
          await addCategory({
            title: `${lastClient.lastName} ${lastClient.firstName}`,
            amount: '0 ₸',
            icon: 'Building2',
            color: 'bg-blue-500',
            row: 3
          });

          // Добавляем иконку в категорию "Клиенты"
          await addCategory({
            title: `${lastClient.lastName} ${lastClient.firstName}`,
            amount: '0 ₸',
            icon: 'User',
            color: 'bg-amber-400',
            row: 1
          });
        } catch (error) {
          console.error('Error adding client icons:', error);
        }
      }
    }

    const updatedClients = await fetchClients();
    setClients(updatedClients);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  if (showClientPage && selectedClient) {
    return (
      <ClientPage
        client={selectedClient}
        onBack={() => setShowClientPage(false)}
        onSave={handleClientSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button onClick={() => window.history.back()} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'building' | 'deposit' | 'built' | 'all')}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="all">Все</option>
                <option value="building">Строим</option>
                <option value="deposit">Задаток</option>
                <option value="built">Построено</option>
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-1" />
                Добавить клиента
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <ClientList
            clients={filteredClients}
            onContextMenu={handleContextMenu}
            onClientClick={handleClientClick}
            status={status}
            onVisibilityChange={handleVisibilityChange}
          />
        )}
      </div>

      {showContextMenu && selectedClient && (
        <ClientContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onVisibilityChange={(visible) => handleVisibilityChange(selectedClient, visible)}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
          currentStatus={selectedClient.status}
          hideProjectIcon={selectedClient.hideProjectIcon}
        />
      )}

      {(showAddModal || showEditModal) && (
        <ClientModal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          client={showEditModal ? editingClient : initialClientState}
          isEditMode={showEditModal}
          yearOptions={yearOptions}
          onSave={handleClientSaved}
        />
      )}

      {showDeleteModal && selectedClient && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
        />
      )}
    </div>
  );
};