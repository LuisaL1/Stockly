import { create } from "zustand";
import { DataModulosConfiguracion, InsertarUsuarios } from "../index";
import { supabase } from "../supabase/supabase.config";
import { InsertarAsignaciones, MostrarModulos, MostrarPermisos, MostrarUsuarios, MostrarUsuariosTodos, InsertarPermisos, BuscarUsuarios, EditarUsuarios, EliminarPermisos, EliminarUsuarios } from "../supabase/crudUsuarios";

export const useUsuariosStore = create((set, get) => ({
  datamodulos: [],
  insertarUsuarioAdmin: async (p) => {
    if (!p.email || !p.pass || p.pass.length < 6) {
      console.error("Email o contraseña inválidos");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: p.email,
      password: p.pass,
    });

    console.log("data del registro del userath", data);
    if (error) {
      console.error("Error al registrar usuario:", error.message);
      return;
    }

    const datauser = await InsertarUsuarios({
      idauth: data.user.id,
      fecharegistro: new Date(),
      tipouser: "Dueño",
    });


    return datauser;
  },
  idusuario :0,
  MostrarUsuarios: async()=>{
    const response = await MostrarUsuarios();
    set({idusuario:response.id});
    return response;
  },
      buscador: "",
      setBuscador: (p) =>{
          set ({buscador: p})
      },
      datausuarios: [],
      usuariosItemSelect: [],
      parametros: {},
      MostrarUsuariosTodos: async (p) =>{
          const response = await MostrarUsuariosTodos(p);
          set ({parametros:p})
          set ({datausuarios:response})
          set ({usuariosItemSelect: response [0]});
          return response;
      },
  
      selectUsuarios:(p) =>{
          set({usuariosItemSelect : p})
      },
      insertarUsuarios: async (parametrosAuth, p, datacheckpermisos)=>{
        console.log("👉 parametrosAuth:", parametrosAuth);
          const {data, error} = await supabase.auth.signUp({
            email: parametrosAuth.email,
            password: parametrosAuth.pass
            
          })
          if (error){
            return null
          }
          const dataUserNew = await InsertarUsuarios({
            nombres: p.nombres,
            email: p.email,
            nro_docum: p.nrodoc,
            telefono: p.telefono,
            direccion: p.direccion,
            fecharegistro: new Date(),
            estado: "activo",
            idauth: data.user.id,
            tipouser: p.tipouser
          })
          console.log(datacheckpermisos)
      await InsertarAsignaciones({
        id_empresa: p.id_empresa,
        id_usuario: dataUserNew.id
      });

    
      datacheckpermisos.forEach(async(item)=>{
        if (item.check){
          let parametrospermisos ={
            id_usuario: dataUserNew.id,
            idmodulo: item.id
          }
          await InsertarPermisos(parametrospermisos);
        }
      });
      
      await supabase.auth.signOut(); 
      },
      EliminarUsuarios: async (p) =>{
          await EliminarUsuarios(p);
          const {MostrarUsuarios} =get();
          const {parametros} = get();
          set(MostrarUsuarios(parametros));
      },
      EditarUsuarios: async (p, datacheckpermisos, idempresa) =>{
          await EliminarPermisos({id_usuario:p.id});
          datacheckpermisos.forEach(async(item)=>{
          if (item.check){
          let parametrospermisos ={
            id_usuario: p.id,
            idmodulo: item.id,
          };
          await InsertarPermisos(parametrospermisos);
        }
      });
          await EditarUsuarios(p);
          const {MostrarUsuariosTodos} =get();
          set(MostrarUsuariosTodos({_id_empresa:idempresa}));
      },
      BuscarUsuarios: async (p) =>{
          const response = await BuscarUsuarios(p);
          set({datausuarios: response});
          console.log("buscando personas")
          return response;
      },
      MostrarModulos: async()=>{
        const response = await MostrarModulos()
        set({datamodulos:response})
        return response;
      },
      datapermisos: [],
      MostrarPermisos: async(p)=>{
        const response = await MostrarPermisos(p);
        set({datapermisos: response});
        let allDocs = [];
        DataModulosConfiguracion.map((element)=>{
          const statePermiso = response.some((objeto)=>
          objeto.modulos.nombre.includes(element.title)
        );
          if(statePermiso){
            allDocs.push({...element,state:true})
          } else{
            allDocs.push({...element,state:false})
          }
        });
        DataModulosConfiguracion.splice(0,DataModulosConfiguracion.length)
        DataModulosConfiguracion.push(...allDocs)
        
        return response;
      },
      datapermisosEdit: [],
      MostrarPermisosEdit: async(p)=>{
        const response = await MostrarPermisos(p);
        set({datapermisosEdit: response});
        console.log("dato seleccionado")
        return response;
      }
  }));
